oc new-project guestbook2
oc new-app --template=mongodb-persistent -p VOLUME_CAPACITY=1Gi -p MONGODB_DATABASE=sampledb
oc new-app --as-deployment-config=true https://github.com/lebrisg/guestbook2.git
oc expose service/guestbook2
