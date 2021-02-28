# TimeLock

**TimeLock is a service to store information that is allowed to be retrieved only after a specific  
time period that has been set.**  
  
  

Each stored information falls at all times under one of the following catagories:  


- `blocked`  information is not possible to be retrieved, no request to unblock it has been done.

- `willBeAvailable`  information has been requested to be available but the specific time period  
that has been set has not passed yet.

- `available`  information can be retrieved because the time period that has been set passed.
