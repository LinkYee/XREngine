import classNames from 'classnames'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BuilderTag } from '@xrengine/common/src/interfaces/BuilderTags'

import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Container from '@mui/material/Container'
import DialogActions from '@mui/material/DialogActions'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'

import { ProjectService, useProjectState } from '../../../common/services/ProjectService'
import DrawerView from '../../common/DrawerView'
import InputSelect, { InputMenuItem } from '../../common/InputSelect'
import styles from '../../styles/admin.module.scss'

interface Props {
  open: boolean
  builderTags: BuilderTag[]
  onClose: () => void
}

const UpdateDrawer = ({ open, builderTags, onClose }: Props) => {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [updateProjects, setUpdateProjects] = useState(false)
  const [projectsToUpdate, setProjectsToUpdate] = useState({})

  const adminProjectState = useProjectState()
  const adminProjects = adminProjectState.projects

  const handleClose = () => {
    setError('')
    setSelectedTag('')
    setUpdateProjects(false)
    setProjectsToUpdate({})
    onClose()
  }

  const handleTagChange = async (e) => {
    setSelectedTag(e.target.value)
  }

  const tagMenu: InputMenuItem[] = builderTags.map((el) => {
    const pushedDate = new Date(el.pushedAt).toLocaleString('en-us', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    })
    return {
      value: el.tag,
      label: `Engine Version ${el.engineVersion} -- Commit ${el.commitSHA.slice(0, 8)} -- Pushed ${pushedDate}`
    }
  })

  const handleSubmit = async () => {
    await ProjectService.updateEngine(selectedTag, updateProjects, Object.keys(projectsToUpdate))
    handleClose()
  }

  const toggleProjectToUpdate = async (projectName: string) => {
    if (projectsToUpdate[projectName]) {
      delete projectsToUpdate[projectName]
      setProjectsToUpdate(projectsToUpdate)
    } else {
      projectsToUpdate[projectName] = true
      setProjectsToUpdate(projectsToUpdate)
    }
  }

  return (
    <DrawerView open={open} onClose={handleClose}>
      <Container maxWidth="sm" className={styles.mt20}>
        <DialogTitle
          className={classNames({
            [styles.textAlign]: true,
            [styles.drawerHeader]: true
          })}
        >
          {' '}
          {t('admin:components.project.updateEngine')}
        </DialogTitle>

        {
          <InputSelect
            name="tagData"
            label={t('admin:components.project.tagData')}
            value={selectedTag}
            menu={tagMenu}
            error={error}
            onChange={handleTagChange}
          />
        }

        <FormControlLabel
          control={<Checkbox checked={updateProjects} onChange={() => setUpdateProjects(!updateProjects)} />}
          label={t('admin:components.project.updateSelector')}
        />

        {updateProjects && (
          <>
            <div className={styles.projectUpdateWarning}>
              <WarningAmberIcon />
              {t('admin:components.project.projectWarning')}
            </div>
            <div className={styles.projectSelector}>
              {adminProjects.value?.map((project) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={projectsToUpdate[project.name]}
                      onChange={() => toggleProjectToUpdate(project.name)}
                    />
                  }
                  label={project.name}
                />
              ))}
            </div>
          </>
        )}

        <DialogActions>
          {
            <>
              <Button className={styles.outlinedButton} onClick={handleClose}>
                {t('admin:components.common.cancel')}
              </Button>
              <Button className={styles.gradientButton} disabled={selectedTag === ''} onClick={handleSubmit}>
                {t('admin:components.common.submit')}
              </Button>
            </>
          }
        </DialogActions>
      </Container>
    </DrawerView>
  )
}

export default UpdateDrawer
