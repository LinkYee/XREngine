import { Params } from '@feathersjs/feathers'
import { OctokitResponse } from '@octokit/types'
import appRootPath from 'app-root-path'
import AWS from 'aws-sdk'
import axios from 'axios'
import { compareVersions } from 'compare-versions'
import _ from 'lodash'
import path from 'path'

import { ProjectBranchInterface } from '@xrengine/common/src/interfaces/ProjectBranchInterface'
import { ProjectPackageJsonType } from '@xrengine/common/src/interfaces/ProjectInterface'
import { ProjectTagInterface } from '@xrengine/common/src/interfaces/ProjectTagInterface'
import { ProjectConfigInterface, ProjectEventHooks } from '@xrengine/projects/ProjectConfigInterface'

import { Application } from '../../../declarations'
import config from '../../appconfig'
import { getStorageProvider } from '../../media/storageprovider/storageprovider'
import logger from '../../ServerLogger'
import { getOctokitForChecking } from './github-helper'
import { ProjectParams } from './project.class'

const publicECRRegex = /^public.ecr.aws\/[a-zA-Z0-9]+\/([\w\d\s\-_]+)$/
const privateECRRegex = /^[a-zA-Z0-9]+.dkr.ecr.([\w\d\s\-_]+).amazonaws.com\/([\w\d\s\-_]+)$/

interface GitHubFile {
  status: number
  url: string
  data: {
    name: string
    path: string
    sha: string
    size: number
    url: string
    html_url: string
    git_url: string
    download_url: string
    type: string
    content: string
    encoding: string
    _links: {
      self: string
      git: string
      html: string
    }
  }
}

export const updateBuilder = async (
  app: Application,
  tag: string,
  data,
  params: ProjectParams,
  storageProviderName?: string
) => {
  try {
    // invalidate cache for all installed projects
    await getStorageProvider(storageProviderName).createInvalidation(['projects*'])
  } catch (e) {
    logger.error(e, `[Project Rebuild]: Failed to invalidate cache with error: ${e.message}`)
  }

  if (data.updateProjects) {
    const projects = await app.service('project').find({
      query: {
        name: {
          $in: data.projectsToUpdate
        },
        repositoryPath: {
          $ne: null
        }
      }
    })

    console.log('projects to update with builder', projects)

    await Promise.all(
      projects.data.map(async (project) => {
        if (!params.query) params.query = {}
        params.query.branchName = `${config.server.releaseName}-deployment`
        let commitSHA
        const tags = await getTags(app, project.repositoryPath, params)
        if (tags.hasOwnProperty('error')) throw new Error((tags as any).text)
        const engineVersion = '1.0.0-rc1' //getEnginePackageJson().version
        const tagMatchingEngineVersion = (tags as ProjectTagInterface[]).find(
          (tag) => tag.engineVersion === engineVersion
        )
        if (tagMatchingEngineVersion) commitSHA = tagMatchingEngineVersion.commitSHA
        else commitSHA = tags[0].commitSHA

        const updateParams = {
          sourceURL: project.repositoryPath,
          destinationURL: project.repositoryPath,
          name: project.name,
          reset: true,
          commitSHA
        }
        await app.service('project').update(updateParams, null, params)
      })
    )
  }

  // trigger k8s to re-run the builder service
  if (app.k8AppsClient) {
    try {
      logger.info('Attempting to update builder tag')
      const builderRepo = process.env.BUILDER_REPOSITORY
      const updateBuilderTagResponse = await app.k8AppsClient.patchNamespacedDeployment(
        `${config.server.releaseName}-builder-xrengine-builder`,
        'default',
        {
          spec: {
            template: {
              spec: {
                containers: [
                  {
                    name: 'xrengine-builder',
                    image: `${builderRepo}:${tag}`
                  }
                ]
              }
            }
          }
        },
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/strategic-merge-patch+json'
          }
        }
      )
      logger.info(updateBuilderTagResponse, 'updateBuilderTagResponse')
      return updateBuilderTagResponse
    } catch (e) {
      logger.error(e)
      return e
    }
  }
}

export const checkBuilderService = async (app: Application): Promise<boolean> => {
  let isRebuilding = true

  // check k8s to find the status of builder service
  if (app.k8DefaultClient && !config.server.local) {
    try {
      logger.info('Attempting to check k8s rebuild status')

      const builderLabelSelector = `app.kubernetes.io/instance=${config.server.releaseName}-builder`
      const containerName = 'xrengine-builder'

      const builderPods = await app.k8DefaultClient.listNamespacedPod(
        'default',
        undefined,
        false,
        undefined,
        undefined,
        builderLabelSelector
      )
      const runningBuilderPods = builderPods.body.items.filter((item) => item.status && item.status.phase === 'Running')

      if (runningBuilderPods.length > 0) {
        const podName = runningBuilderPods[0].metadata?.name

        const builderLogs = await app.k8DefaultClient.readNamespacedPodLog(
          podName!,
          'default',
          containerName,
          undefined,
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        )

        const isCompleted = builderLogs.body.includes('sleep infinity')
        if (isCompleted) {
          logger.info(podName, 'podName')
          isRebuilding = false
        }
      }
    } catch (e) {
      logger.error(e)
      return e
    }
  } else {
    isRebuilding = false
  }

  return isRebuilding
}

const projectsRootFolder = path.join(appRootPath.path, 'packages/projects/projects/')

export const onProjectEvent = async (
  app: Application,
  projectName: string,
  hookPath: string,
  eventType: keyof ProjectEventHooks
) => {
  const hooks = require(path.resolve(projectsRootFolder, projectName, hookPath)).default
  if (typeof hooks[eventType] === 'function') await hooks[eventType](app)
}

export const getProjectConfig = async (projectName: string): Promise<ProjectConfigInterface> => {
  try {
    return (await import(`@xrengine/projects/projects/${projectName}/xrengine.config.ts`)).default
  } catch (e) {
    logger.error(
      e,
      '[Projects]: WARNING project with ' +
        `name ${projectName} has no xrengine.config.ts file - this is not recommended.`
    )
    return null!
  }
}

export const getProjectPackageJson = (projectName: string): ProjectPackageJsonType => {
  return require(path.resolve(projectsRootFolder, projectName, 'package.json'))
}

export const getEnginePackageJson = (): ProjectPackageJsonType => {
  return require(path.resolve(appRootPath.path, 'packages/server-core/package.json'))
}

export const getProjectEnv = async (app: Application, projectName: string) => {
  const projectSetting = await app.service('project-setting').find({
    query: {
      $limit: 1,
      name: projectName,
      $select: ['settings']
    }
  })
  const settings = {} as { [key: string]: string }
  Object.values(projectSetting).map(({ key, value }) => (settings[key] = value))
  return settings
}

export const checkProjectDestinationMatch = async (app: Application, params: ProjectParams) => {
  const { sourceURL, destinationURL, sourceIsPublicURL, destinationIsPublicURL, existingProject } = params.query!
  const {
    owner: destinationOwner,
    repo: destinationRepo,
    octoKit: destinationOctoKit
  } = await getOctokitForChecking(app, destinationURL!, {
    ...params,
    query: { isPublicURL: destinationIsPublicURL! }
  })
  const {
    owner: sourceOwner,
    repo: sourceRepo,
    octoKit: sourceOctoKit
  } = await getOctokitForChecking(app, sourceURL!, { ...params, query: { isPublicURL: sourceIsPublicURL } })

  if (!sourceOctoKit)
    return {
      error: 'invalidSourceOctokit',
      text: 'The GitHub app being used by this installation does not have access to the source GitHub repo'
    }
  if (!destinationOctoKit)
    return {
      error: 'invalidDestinationOctokit',
      text: 'The GitHub app being used by this installation does not have access to the destination GitHub repo'
    }
  const [sourceBlobResponse, destinationBlobResponse]: [sourceBlobResponse: any, destinationBlobResponse: any] =
    await Promise.all([
      new Promise(async (resolve, reject) => {
        try {
          const sourcePackage = await sourceOctoKit.request(
            `GET /repos/${sourceOwner}/${sourceRepo}/contents/package.json`
          )
          resolve(sourcePackage)
        } catch (err) {
          logger.error(err)
          if (err.status === 404) {
            resolve({
              error: 'sourcePackageMissing',
              text: 'There is no package.json in the source repo'
            })
          } else reject(err)
        }
      }),
      new Promise(async (resolve, reject) => {
        try {
          const destinationPackage = await destinationOctoKit.request(
            `GET /repos/${destinationOwner}/${destinationRepo}/contents/package.json`
          )
          resolve(destinationPackage)
        } catch (err) {
          logger.error('destination package fetch error', err)
          if (err.status === 404) {
            resolve({
              error: 'destinationPackageMissing',
              text: 'There is no package.json in the source repo'
            })
          } else reject(err)
        }
      })
    ])
  if (sourceBlobResponse.error) return sourceBlobResponse
  const sourceContent = JSON.parse(
    Buffer.from(sourceBlobResponse.data.content, sourceBlobResponse.data.encoding).toString()
  )
  if (!existingProject) {
    const projectExists = await app.service('project').find({
      query: {
        name: sourceContent.name
      }
    })
    if (projectExists.data.length > 0)
      return {
        sourceProjectMatchesDestination: false,
        error: 'projectExists',
        text: `The source project, ${sourceContent.name}, is already installed`
      }
  }
  if (destinationBlobResponse.error && destinationBlobResponse.error !== 'destinationPackageMissing')
    return destinationBlobResponse
  if (destinationBlobResponse.error === 'destinationPackageMissing')
    return { sourceProjectMatchesDestination: true, projectName: sourceContent.name }
  const destinationContent = JSON.parse(Buffer.from(destinationBlobResponse.data.content, 'base64').toString())
  if (sourceContent.name.toLowerCase() !== destinationContent.name.toLowerCase())
    return {
      error: 'invalidRepoProjectName',
      text: 'The repository you are attempting to update from contains a different project than the one you are updating'
    }
  else return { sourceProjectMatchesDestination: true, projectName: sourceContent.name }
}

export const checkDestination = async (app: Application, url: string, params?: ProjectParams) => {
  const isPublicURL = params!.query!.isPublicURL
  const inputProjectURL = params!.query!.inputProjectURL!
  const octokitResponse = await getOctokitForChecking(app, url, params!)
  const { owner, repo, octoKit } = octokitResponse

  if (!octoKit)
    return {
      error: 'invalidDestinationOctokit',
      text: 'The GitHub app being used by this installation does not have access to the destination GitHub repo'
    }

  try {
    const repoResponse = await octoKit.request(`GET /repos/${owner}/${repo}`)
    let destinationPackage
    try {
      destinationPackage = await octoKit.request(`GET /repos/${owner}/${repo}/contents/package.json`)
    } catch (err) {
      logger.error('destination package fetch error', err)
      if (err.status !== 404) throw err
    }
    const returned = {
      destinationValid: isPublicURL ? repoResponse.data.permissions.push || repoResponse.data.permissions.admin : true
    } as any
    if (destinationPackage)
      returned.projectName = JSON.parse(Buffer.from(destinationPackage.data.content, 'base64').toString()).name
    else returned.repoEmpty = true
    if (!returned.destinationValid) {
      returned.error = 'invalidPermission'
      returned.text =
        'You do not have personal push or admin access to this repo. If the GitHub app associated with this deployment is installed in this repo, please select "Installed GitHub app" and then select it from the list that appears.'
    }

    if (inputProjectURL?.length > 0) {
      const projectOctokitResponse = await getOctokitForChecking(app, inputProjectURL, params!)
      const { owner: existingOwner, repo: existingRepo, octoKit: projectOctoKit } = projectOctokitResponse
      if (!projectOctoKit)
        return {
          error: 'invalidDestinationOctokit',
          text: 'The GitHub app being used by this installation does not have access to the new GitHub repo'
        }
      let existingProjectPackage
      try {
        existingProjectPackage = await projectOctoKit.request(
          `GET /repos/${existingOwner}/${existingRepo}/contents/package.json`
        )
        const existingProjectName = JSON.parse(
          Buffer.from(existingProjectPackage.data.content, 'base64').toString()
        ).name
        if (!returned.repoEmpty && existingProjectName !== returned.projectName) {
          returned.error = 'mismatchedProjects'
          returned.text = `The new destination repo contains project '${returned.projectName}', which is different than the current project '${existingProjectName}'`
        }
      } catch (err) {
        logger.error('destination package fetch error', err)
        if (err.status !== 404) throw err
      }
    }
    return returned
  } catch (err) {
    logger.error('error checking destination URL %o', err)
    if (err.status === 404)
      return {
        error: 'invalidUrl',
        text: 'Project URL is not a valid GitHub URL, or the GitHub repo is private'
      }
    throw err
  }
}

export const getBranches = async (app: Application, url: string, params?: ProjectParams) => {
  const octokitResponse = await getOctokitForChecking(app, url, params!)
  const { owner, repo, octoKit } = octokitResponse

  if (!octoKit)
    return {
      error: 'invalidSourceOctokit',
      text: 'The GitHub app being used by this installation does not have access to the source GitHub repo'
    }

  try {
    const repoResponse = await octoKit.request(`GET /repos/${owner}/${repo}`)
    const returnedBranches = [{ name: repoResponse.data.default_branch, isMain: true }] as ProjectBranchInterface[]
    const deploymentBranch = `${config.server.releaseName}-deployment`
    try {
      await octoKit.request(`GET /repos/${owner}/${repo}/branches/${deploymentBranch}`)
      returnedBranches.push({
        name: deploymentBranch,
        isMain: false
      })
    } catch (err) {
      logger.error(err)
    }
    return returnedBranches
  } catch (err) {
    logger.error('error getting branches for project %o', err)
    if (err.status === 404)
      return {
        error: 'invalidUrl',
        text: 'Project URL is not a valid GitHub URL, or the GitHub repo is private'
      }
    throw err
  }
}

export const getTags = async (
  app: Application,
  url: string,
  params?: ProjectParams
): Promise<ProjectTagInterface[] | { error: string; text: string }> => {
  try {
    const octokitResponse = await getOctokitForChecking(app, url, params!)
    const { owner, repo, octoKit } = octokitResponse

    if (!octoKit)
      return {
        error: 'invalidDestinationOctokit',
        text: 'You does not have access to the destination GitHub repo'
      }

    let headIsTagged = false
    const enginePackageJson = getEnginePackageJson()
    const repoResponse = await octoKit.request(`GET /repos/${owner}/${repo}`)
    const branchName = params!.query!.branchName || (repoResponse as any).default_branch
    const [headResponse, tagResponse] = await Promise.all([
      octoKit.request(`GET /repos/${owner}/${repo}/commits`, {
        sha: branchName
      }),
      octoKit.request(`GET /repos/${owner}/${repo}/tags`, {
        sha: branchName
      })
    ])
    const commits = headResponse.data.map((commit) => commit.sha)
    const matchingTags = tagResponse.data.filter((tag) => commits.indexOf(tag.commit.sha) > -1)
    let tagDetails = (await Promise.all(
      matchingTags.map(
        (tag) =>
          new Promise(async (resolve, reject) => {
            try {
              console.log('tag', tag, owner, repo)
              if (tag.commit.sha === headResponse.data[0].sha) headIsTagged = true
              const blobResponse = await octoKit.request(`GET /repos/${owner}/${repo}/contents/package.json`, {
                ref: tag.name
              })
              const content = JSON.parse(Buffer.from(blobResponse.data.content, 'base64').toString())
              resolve({
                projectName: content.name,
                projectVersion: tag.name,
                engineVersion: content.etherealEngine?.version,
                commitSHA: tag.commit.sha,
                matchesEngineVersion: content.etherealEngine?.version
                  ? compareVersions(content.etherealEngine?.version, enginePackageJson.version || '0.0.0') === 0
                  : false
              })
            } catch (err) {
              logger.error('Error getting tagged package.json %s/%s:%s %s', owner, repo, tag.name, err.toString())
              reject(err)
            }
          })
      )
    )) as ProjectTagInterface[]
    tagDetails = tagDetails.sort((a, b) => compareVersions(b.projectVersion, a.projectVersion))
    if (!headIsTagged) {
      const headContent = await octoKit.request(`GET /repos/${owner}/${repo}/contents/package.json`)
      const content = JSON.parse(Buffer.from(headContent.data.content, 'base64').toString())
      tagDetails.unshift({
        projectName: content.name,
        projectVersion: '{Latest commit}',
        engineVersion: content.etherealEngine?.version,
        commitSHA: headResponse.data[0].sha,
        matchesEngineVersion: content.etherealEngine?.version
          ? compareVersions(content.etherealEngine?.version, enginePackageJson.version || '0.0.0') === 0
          : false
      })
    }
    return tagDetails
  } catch (err) {
    logger.error('error getting repo tags %o', err)
    if (err.status === 404)
      return {
        error: 'invalidUrl',
        text: 'Project URL is not a valid GitHub URL, or the GitHub repo is private'
      }
    else if (err.status === 409)
      return {
        error: 'repoEmpty',
        text: 'This repo is empty'
      }
    throw err
  }
}

export const findBuilderTags = async () => {
  const builderRepo = process.env.BUILDER_REPOSITORY || ''
  const publicECRExec = publicECRRegex.exec(builderRepo)
  const privateECRExec = privateECRRegex.exec(builderRepo)
  if (publicECRExec) {
    const ecr = new AWS.ECRPUBLIC({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: 'us-east-1'
    })
    const result = await ecr
      .describeImages({
        repositoryName: publicECRExec[1]
      })
      .promise()
    if (!result || !result.imageDetails) return []
    return result.imageDetails
      .filter(
        (imageDetails) => imageDetails.imageTags && imageDetails.imageTags.length > 0 && imageDetails.imagePushedAt
      )
      .sort((a, b) => b.imagePushedAt!.getTime() - a!.imagePushedAt!.getTime())
      .map((imageDetails) => {
        const tag = imageDetails.imageTags!.find((tag) => !/latest/.test(tag))
        const tagSplit = tag ? tag.split('_') : ''
        return {
          tag,
          commitSHA: tagSplit.length === 1 ? tagSplit[0] : tagSplit[1],
          engineVersion: tagSplit.length === 1 ? 'unknown' : tagSplit[0],
          pushedAt: imageDetails.imagePushedAt!.toJSON()
        }
      })
  } else if (privateECRExec) {
    const ecr = new AWS.ECR({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: privateECRExec[1]
    })
    const result = await ecr
      .describeImages({
        repositoryName: privateECRExec[2]
      })
      .promise()
    if (!result || !result.imageDetails) return []
    return result.imageDetails
      .filter(
        (imageDetails) => imageDetails.imageTags && imageDetails.imageTags.length > 0 && imageDetails.imagePushedAt
      )
      .sort((a, b) => b.imagePushedAt!.getTime() - a.imagePushedAt!.getTime())
      .map((imageDetails) => {
        const tag = imageDetails.imageTags!.find((tag) => !/latest/.test(tag))
        const tagSplit = tag ? tag.split('_') : ''
        return {
          tag,
          commitSHA: tagSplit.length === 1 ? tagSplit[0] : tagSplit[1],
          engineVersion: tagSplit.length === 1 ? 'unknown' : tagSplit[0],
          pushedAt: imageDetails.imagePushedAt!.toJSON()
        }
      })
  } else {
    const repoSplit = builderRepo.split('/')
    const registry = repoSplit.length === 1 ? 'lagunalabs' : repoSplit[0]
    const repo = repoSplit.length === 1 ? repoSplit[0] : repoSplit[1]
    const result = await axios.get(
      `https://registry.hub.docker.com/v2/repositories/${registry}/${repo}/tags?page_size=100`
    )
    return result.data.results.map((imageDetails) => {
      const tag = imageDetails.name
      const tagSplit = tag.split('_')
      return {
        tag,
        commitSHA: tagSplit.length === 1 ? tagSplit[0] : tagSplit[1],
        engineVersion: tagSplit.length === 1 ? 'unknown' : tagSplit[0],
        pushedAt: new Date(imageDetails.tag_last_pushed).toJSON()
      }
    })
  }
}
