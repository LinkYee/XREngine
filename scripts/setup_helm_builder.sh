set -e
set -x

sudo apt-get -y update

#install kubectl
curl -LO "http://xr-resources.yee.link/Asset/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

#install Helm
curl -fsSL -o get_helm.sh http://xr-resources.yee.link/Asset/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh


helm repo add xrengine https://helm.xrengine.io

helm repo update

set +x
