var util = require('util');
var bleno = require('bleno');
var schedule = require('node-schedule');
var isNew; //boolean used for initialization of schedules
var buffer; //stores address of connecting device

var Gpio = require('pigpio').Gpio,
  servo = new Gpio(10, {mode: Gpio.OUTPUT});

var Gpio = require('onoff').Gpio,
 maker = new Gpio(21, 'out'),
 water = new Gpio(20, 'out');

var PrimaryService = bleno.PrimaryService;
var Characteristic = bleno.Characteristic;
var Descriptor = bleno.Descriptor;

var UnlockCharacteristic = function() {
 UnlockCharacteristic.super_.call(this, {
 uuid: 'd271',
 properties: ['write'],
 descriptors: [
 new Descriptor({
uuid: '2901',
 value: 'Unlock'
 })
 ]
 });
 };
util.inherits(UnlockCharacteristic, Characteristic);

function doServo(servings) { //serving a string need to parseint

	console.log('Pouring Coffee');
	 
	servo.servoWrite(2500);
	maker.writeSync(1);
	water.writeSync(1);
	
	setTimeout(function() {
	console.log('Done Pouring Coffee');
	
	servo.servoWrite(500);
	maker.writeSync(0);
	water.writeSync(0);
	}, 10000); //second argument is timer in ms
}

UnlockCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse,
callback) { 

 var message = data.toString();
if(message.length == 1) { //if not a schedule just do serving
	doServo(message);
}
else {	
	var arrayMessage = message.split(' -- ');
	if(arrayMessage[0] == 'add') { //checks the property of the received message and schedules if property is add
	 isNew = false;
	 schedule.scheduleJob(arrayMessage[1], arrayMessage[1], function(){
	 doServo(arrayMessage[2]);
	});
	}
	else if(arrayMessage[0] == 'del') {
	 var my_job = schedule.scheduledJobs[arrayMessage[1]];
	 my_job.cancel();
	}
	else {
		if(isNew) {
			isNew = false;
			var format = message.replace('new -- ', ''); //format received 'new -- 1 2 * * 1 -- 1@2 3 * * 2 -- 2				
			var array = format.split('@');
			var temp;
			for(var i=0;i<array.length;i++) { //schedules all jobs extracted from the received string
				temp = array[i].split(' -- ');
				schedule.scheduleJob(temp[0], temp[0], function(){
				 doServo(temp[1]);
				});				
			}			
		}
	}
	
} 
 console.log('Received Info: ' + data);
 callback(this.RESULT_SUCCESS);
};

var StatusCharacteristic = function(unlockCharacteristic) {
 StatusCharacteristic.super_.call(this, {
 uuid: 'd272',
 properties: ['notify'],
 descriptors: [
 new Descriptor({
 uuid: '2901',
 value: 'Status Message'
 })
 ]
 });
 unlockCharacteristic.on('status', this.onUnlockStatusChange.bind(this));
 };
util.inherits(StatusCharacteristic, Characteristic);

StatusCharacteristic.prototype.onUnlockStatusChange = function(status) {
 if (this.updateValueCallback) {
 this.updateValueCallback(new Buffer(status));
 }
};

var unlockCharacteristic = new UnlockCharacteristic();
var statusCharacteristic = new StatusCharacteristic(unlockCharacteristic);

var lockService = new PrimaryService({
 uuid: 'd270',
 characteristics: [
 unlockCharacteristic,
 statusCharacteristic
 ]
});

bleno.on('stateChange', function(state) {
 console.log('on -> stateChange: ' + state);
 if (state === 'poweredOn') {
 bleno.startAdvertising('RPi Pipe', [lockService.uuid]);
 } else {
 bleno.stopAdvertising();
 }
});
// Notify the console that we've accepted a connection
bleno.on('accept', function(clientAddress) {
    console.log("Accepted connection from address: " + clientAddress);
	if(buffer == clientAddress) return;
	buffer = clientAddress;
	isNew = true;
});

bleno.on('advertisingStart', function(error) {
 console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));
 if (!error) {
 bleno.setServices([lockService]);
 }
});

function exit() {
 water.unexport();
 maker.unexport();
 process.exit();
}
process.on('SIGINT', exit);
