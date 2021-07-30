// Import built-in Node.js package path.
const path = require('path');

/**
 * Import the ServiceNowConnector class from local Node.js module connector.js
 *   and assign it to constant ServiceNowConnector.
 * When importing local modules, IAP requires an absolute file reference.
 * Built-in module path's join method constructs the absolute filename.
 */
const ServiceNowConnector = require(path.join(__dirname, '/connector.js'));

/**
 * Import built-in Node.js package events' EventEmitter class and
 * assign it to constant EventEmitter. We will create a child class
 * from this class.
 */
const EventEmitter = require('events').EventEmitter;

/**
 * The ServiceNowAdapter class.
 *
 * @summary ServiceNow Change Request Adapter
 * @description This class contains IAP adapter properties and methods that IAP
 *   brokers and products can execute. This class inherits the EventEmitter
 *   class.
 */
class ServiceNowAdapter extends EventEmitter {

  /**
   * Here we document the ServiceNowAdapter class' callback. It must follow IAP's
   *   data-first convention.
   * @callback ServiceNowAdapter~requestCallback
   * @param {(object|string)} responseData - The entire REST API response.
   * @param {error} [errorMessage] - An error thrown by REST API call.
   */

  /**
   * Here we document the adapter properties.
   * @typedef {object} ServiceNowAdapter~adapterProperties - Adapter
   *   instance's properties object.
   * @property {string} url - ServiceNow instance URL.
   * @property {object} auth - ServiceNow instance credentials.
   * @property {string} auth.username - Login username.
   * @property {string} auth.password - Login password.
   * @property {string} serviceNowTable - The change request table name.
   */

  /**
   * @memberof ServiceNowAdapter
   * @constructs
   *
   * @description Instantiates a new instance of the Itential ServiceNow Adapter.
   * @param {string} id - Adapter instance's ID.
   * @param {ServiceNowAdapter~adapterProperties} adapterProperties - Adapter instance's properties object.
   */
  constructor(id, adapterProperties) {
    // Call super or parent class' constructor.
    super();
    // Copy arguments' values to object properties.
    this.id = id;
    this.props = adapterProperties;
    // Instantiate an object from the connector.js module and assign it to an object property.
    this.connector = new ServiceNowConnector({
      url: this.props.url,
      username: this.props.auth.username,
      password: this.props.auth.password,
      serviceNowTable: this.props.serviceNowTable
    });
  }

  /**
   * @memberof ServiceNowAdapter
   * @method connect
   * @summary Connect to ServiceNow
   * @description Complete a single healthcheck and emit ONLINE or OFFLINE.
   *   IAP calls this method after instantiating an object from the class.
   *   There is no need for parameters because all connection details
   *   were passed to the object's constructor and assigned to object property this.props.
   */
  connect() {
    // As a best practice, Itential recommends isolating the health check action
    // in its own method.
    this.healthcheck();
  }

 /**
 * @memberof ServiceNowAdapter
 * @method healthcheck
 * @summary Check ServiceNow Health
 * @description Verifies external system is available and healthy.
 *   Calls method emitOnline if external system is available.
 *
 * @param {ServiceNowAdapter~requestCallback} [callback] - The optional callback
 *   that handles the response.
 */
healthcheck(callback) {
 this.getRecord((result, error) => {
   if (error) {
       this.emitOffline();
       log.error('\nError returned from Adapter instance ' + this.id);

   } else {
       this.emitOnline();
       log.debug('\nAdapter instance ' + this.id + ' is online');

   }
 });
}

  /**
   * @memberof ServiceNowAdapter
   * @method emitOffline
   * @summary Emit OFFLINE
   * @description Emits an OFFLINE event to IAP indicating the external
   *   system is not available.
   */
  emitOffline() {
    this.emitStatus('OFFLINE');
    log.warn('ServiceNow: Instance is unavailable.');
  }

  /**
   * @memberof ServiceNowAdapter
   * @method emitOnline
   * @summary Emit ONLINE
   * @description Emits an ONLINE event to IAP indicating external
   *   system is available.
   */
  emitOnline() {
    this.emitStatus('ONLINE');
    log.info('ServiceNow: Instance is available.');
  }

  /**
   * @memberof ServiceNowAdapter
   * @method emitStatus
   * @summary Emit an Event
   * @description Calls inherited emit method. IAP requires the event
   *   and an object identifying the adapter instance.
   *
   * @param {string} status - The event to emit.
   */
  emitStatus(status) {
    this.emit(status, { id: this.id });
  }

  /**
   * @memberof ServiceNowAdapter
   * @method getRecord
   * @summary Get ServiceNow Record
   * @description Retrieves a record from ServiceNow.
   *
   * @param {ServiceNowAdapter~requestCallback} callback - The callback that
   *   handles the response.
   */
  getRecord(callback) {
    
    //initialize vars
    let callbackData = null;
    let callbackError = null;
    let listOfReturnDocs = null;
    const finalListOfDocs = [];

    //call get function
    this.connector.get((result, error) => {
        //if error return error callback
        if (error) {
            callbackError = error;
        } else {
            //if get call result is not null and is also an obj
            if(result !== null && typeof result === 'object'){

                //if result has 'body' key, parse body into jObject
                if(result.hasOwnProperty('body')){
                    let jsonBody = JSON.parse(result.body);

                    //list of objects in results under 'result' key
                    listOfReturnDocs = jsonBody.result;
                    const finalListOfDocs = [];

                    //loop through list of obj and push each obj to final list
                    //temp obj converts current obj values into generic final results
                    listOfReturnDocs.forEach(function (currentDoc){
                        let tempObj = {};
                        tempObj = {
                            change_ticket_number: currentDoc.number, 
                            active: currentDoc.active, 
                            priority: currentDoc.priority, 
                            description: currentDoc.description, 
                            work_start: currentDoc.work_start, 
                            work_end: currentDoc.work_end, 
                            change_ticket_key: currentDoc.sys_id}

                            finalListOfDocs.push(tempObj);
                        });
                    callbackData = finalListOfDocs;
                }
                else{
                    log.info("The response did not contain the key body")
                }
            }
            else{
                log.info("The result of the get call was not an object")
            }
                //return callback data or error
                return callback(callbackData, callbackError);
        }
    });    
  }

  /**
   * @memberof ServiceNowAdapter
   * @method postRecord
   * @summary Create ServiceNow Record
   * @description Creates a record in ServiceNow.
   *
   * @param {ServiceNowAdapter~requestCallback} callback - The callback that
   *   handles the response.
   */
  postRecord(callback) {
    
    //initialize vars
    let callbackData = null;
    let callbackError = null;
    let returnedDoc = null;
    let finalDoc = null;
     
     //call post function
     this.connector.post((result, error) => {
        if (error) {
            callbackError = error;
        } else {
            //validate that result in not null and also an object
            if(result !== null && typeof result === 'object'){
                
                //if result contains body key, parse result.body into JSON obj
                if(result.hasOwnProperty('body')){
                    let jsonBody = JSON.parse(result.body);
                    returnedDoc = jsonBody.result;

                    //create obj from from values in result
                    finalDoc = {
                        change_ticket_number: returnedDoc.number, 
                        active: returnedDoc.active, 
                        priority: returnedDoc.priority, 
                        description: returnedDoc.description, 
                        work_start: returnedDoc.work_start, 
                        work_end: returnedDoc.work_end, 
                        change_ticket_key: returnedDoc.sys_id
                        }
                    callbackData = finalDoc;
                }
                else{
                    log.info("The response did not contain the key body")
                }
            }
            else{
                log.info("The result of the get call was not an object")
            }
                //return data or error
                return callback(callbackData, callbackError);
        }
    });  
  }
}

module.exports = ServiceNowAdapter;