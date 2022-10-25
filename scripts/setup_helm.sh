set -e
set -x

apt-get -y update

#install Docker
apt-get -y install apt-transport-https ca-certificates curl gnupg lsb-release build-essential
curl -fsSL http://mirrors.ustc.edu.cn/docker-ce/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] http://mirrors.ustc.edu.cn/docker-ce/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get -y update
apt-get -y install docker-ce docker-ce-cli containerd.io


#install kubectl
curl -LO "http://xr-resources.yee.link/Asset/kubectl"
install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

#install Helm
curl -fsSL -o get_helm.sh http://xr-resources.yee.link/Asset/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh

helm repo add xrengine https://helm.xrengine.io

helm repo update
set +x
