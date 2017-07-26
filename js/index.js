var SERVICE_UUID = 'D270';
var UNLOCK_UUID = 'D271';
var MESSAGE_UUID = 'D272';

//start of format to readable string in edit program screen from cron format
function format(str) { //get format 54 5 * * 2 -- 1 and returns readable format T: 5:54 AM Servings: 1
    var res = str.split(" ");
    var final = giveDay(res[4]) + ": ";
    var hour = getHour(res[1]);
    return final.concat(hour[0] + ":" + giveMinute(res[0]) + " " + hour[1] + " Servings: " + res[6]);
}
function giveDay(str) { //get format 0,1,2 and converts to SMT
    var res = str.split(",");
	var final = ""
	for (var i=0; i < res.length; i++) {
	    if(res[i] == 0 || res[i] === 7) final = final.concat('S');
	    else if(res[i] == 1) final = final.concat('M');
	    else if(res[i] == 2) final = final.concat('T');
	    else if(res[i] == 3) final = final.concat('W');
	    else if(res[i] == 4) final = final.concat('H');
	    else if(res[i] == 5) final = final.concat('F');
	    else if(res[i] == 6) final = final.concat('Sa');
	}
    return final;
}
function getHour(str) { //receive military time hour 23 and return array[11,PM];
    var period = 'AM';
    var array = [];
    if(str == "0") { //if military time is 0, change time to 12
        array[0] = 12;
    }
    else if(parseInt(str) > 12) { //if military time > 0, substract 12 and change period to PM
        array[0] = "" + (parseInt(str) - 12);
        period = 'PM';
    }
    else array[0] = str;
    array[1] = period;
    return array;
}
function giveMinute(str) { //changes format minute if single digit by adding 0 ex: from 7 to 07
    if(parseInt(str) < 10) return "0".concat(str);
    return str;
}
//end of format into readable string

//start of function to display scheduled times
function img_clicked(index) {
	var img = document.getElementById("deleteUl"); //get the ul element from document that will contain the cancel image
	var str = document.getElementById("stringUl"); //get the ul element from document that will contain the text string
	var message = str.childNodes[index].innerText; //get string from ul
	img.removeChild(img.childNodes[index]); //remove the child at chosen index
	str.removeChild(str.childNodes[index]);	
 	function success() {
		app.hideProgressIndicator();	
	}
	function failure(reason) {
 	alert("Error sending code " + reason);
	app.hideProgressIndicator();
 	} 	
 	message = backFormat(message); //convert string from readable to cron format
 	cut(message + "@"); //remove string from local storage
 	ble.write( //sends string to remove from the raspberry pi scheduling
 	app.connectedPeripheral.id,
 	SERVICE_UUID,
 	UNLOCK_UUID,
 	stringToArrayBuffer('del -- '+message), 
 	success, failure 
 	);
}
function img_create(src) { //create an image with delete date onclick
	var img = document.createElement('img');
	var index = document.getElementById("deleteUl").childElementCount; //index is number of children before it is appended
    img.src = src;
    img.onclick = function() {
    	img_clicked(index);
    }
    return img;
}
function changeHtml() { //get all the strings stored for the programs scheduled and adds them to the layout
	newEdit(); //reinitialize the program edit screen
	var ul = document.getElementById('stringUl'); 
	var ul2 = document.getElementById('deleteUl');
	var longString = localStorage.getItem('text'); //get stored string
	longString = longString.substring(0,longString.length - 1); //removes last @ for splitting
	var array = longString.split('@');
 	var li;
 	var li2;
 	var delImg;
 	for(var i=0; i<array.length; i++) { //append all strings as li for user to see
	 	li = document.createElement("li");
		li2 = document.createElement("li");
		delImg = img_create('images/cancel.png'); //get image with onclick
		li.appendChild(document.createTextNode(format(array[i]))); //format the text in li to be readable
		li2.appendChild(delImg); //append element to li and then append li to ul
		ul.appendChild(li);
		ul2.appendChild(li2);
 	}	
}
function newEdit() { //clear the program edit screen
	while(stringUl.firstChild) {
		stringUl.removeChild(stringUl.firstChild);
	}
	while(deleteUl.firstChild) {
		deleteUl.removeChild(deleteUl.firstChild);
	}	
}
//end of functions to display scheduled times

function stringToArrayBuffer(str) { //convert string to data that can be sent with bluetooth
 // assuming 8 bit bytes
 var ret = new Uint8Array(str.length);
 for (var i = 0; i < str.length; i++) {
 ret[i] = str.charCodeAt(i);
 console.log(ret[i]);
 }
 return ret.buffer;
}
function bytesToString(buffer) { //convert data received into a string
 return String.fromCharCode.apply(null, new Uint8Array(buffer));
}

//start of function to get cron format from selected options
function getFormatHour(integer, period) { //get AM format and returns military time ex: 11, PM -> 23
	integer++; //cause receives index!! so 1 is at index 0
	if(integer == 12 && period == "PM")
		integer = 12;
	else if(integer == 12 && period == "AM")
		integer = 0;
	else if(period == "PM")
		integer += 12;
	return integer.toString();
}

function getFormatDays(count) { //converts select options to cron format 
	var options = document.getElementById("selectWeeklyDay").options;
	var formatted = "";
	var countCheck = 0;
	for(var i=0; i < 7; i++) {
		if(options[i].selected) {
			countCheck++;
			if(countCheck == count)
				formatted = formatted.concat(""+i);
			else
				formatted = formatted.concat(""+ i + ",");
		}
	}
	return formatted;
}
//end of function to get cron format from selected options



//start of functions to convert readable string from program edit into cron format
function backFormat(str) { //gets readable TWH: 7:54PM Servings: 2 and returns cron 54 19 * * 2,3,4
    return backMinute(str)+ " " + backHour(str) + " * * " + backDays(str) + " -- " + backServing(str);
}
function backMinute(str) { //makes sure to return only the second number if single digit minute ex: 02 -> 2
    var res = str.split(':'); 
    if(res[2].substring(0,1) == '0')return res[2].substring(1,2);
    return res[2].substring(0,2);
}
function backHour(str) { //get readable M: 6:42 AM Servings: 1 and returns military time hour
    var res = str.split(':');
    var final = "";
    if(res[1].length == 2) //if one digit in hour return it
        final = res[1].substring(1,2); //6
    else
        final = res[1].substring(1,3); 
    var integer = parseInt(final); 
    if(res[2].substring(3,5) == "AM"){ // if 12 AM return 0
        if(integer == 12)return 0;
    }
    else if(res[2].substring(3,5) == "PM"){ // if 12 PM return 12 else return hour + 12
       if(integer == 12) return 12;
       else {
           integer += 12;
       }
    }
    return integer + ""; //return string format 6
}

function backDays(str) { //get readable format TWSa: 4:54 PM Servings: 2 and returns days for cron format 2,3,6
    var res = str.split(':'); //so res[0] will have the strings for the days
    var final = "";
    var temp;
    for(var i = 0; i < res[0].length; i++) { //checks each letter and concat an integer version of it
       temp = res[0].substring(i, i+1); //gets letter at index i
       if(temp == 'M') final = final.concat('1'); //concats the final string with converted integer version of the day
       else if(temp == 'T') final = final.concat('2');
       else if(temp == 'W') final = final.concat('3');
       else if(temp == 'H') final = final.concat('4');
       else if(temp == 'F') final = final.concat('5');
       else if(temp == 'S') { //If letter is S checks if it is S or Sa
           if(res[0].substring(i + 1, i + 2) == 'a') { 
               final = final.concat('6');
               i++;
           }
           else
            final = final.concat('0');
       }
       final = final.concat(','); //needs to separate with coma for the cron format
    }

    return final.substring(0, final.length - 1); //takes care of the last coma
}
function backServing(str) { //returns number of servings from readable string
    var res = str.split(':')
    return res[3].substring(1, 2);
}
//end of functions to convert readable string from program edit into cron format

//start of functions to deal with local storage
function save(fieldValue) { //save parameter in local storage
	localStorage.setItem('text', fieldValue);
}

function append(fieldValue) { //save the received parameter concatted to the stored value
	if(get() == null) save('');
	if(findStorage(fieldValue)) {
		return false;}
	var storedValue = get();
	save(storedValue.concat(fieldValue));
	return true;
}
function cut(fieldValue) { //store a new string with the parameter string taken off from the stored string 
	var storedValue = localStorage.getItem('text');
	if(storedValue) {
		save(storedValue.replace(fieldValue, ''));
	}
}
function get() { //return the item stored in the local storage
	return localStorage.getItem('text');	
}
function findStorage(str) { //returns true if the string is already stored in the storage
	var storedValue = localStorage.getItem('text');	
	if(storedValue != '') {
		var array = storedValue.split('@');
		for(var i=0; i<array.length - 1; i++) {
			if((array[i] + "@") == str) {
				alert("Schedule already here!");
				return true;
			}
		}
	}	
	return false;
}
//end of functions to deal with local storage

function startSend() { //when connecting to the rpi sends the currently stored string from local storage
	var longString = localStorage.getItem('text');
	longString = longString.substring(0,longString.length - 1);
	function success() {
	}
	function failure (reason) {
	alert("Error sending code " + reason);
	}
	 ble.write(
	 app.connectedPeripheral.id,
	 SERVICE_UUID,
	 UNLOCK_UUID,
	 stringToArrayBuffer('new -- '+longString),
	 success, failure
	 );
	
}
var app = {
 initialize: function() {
 this.bindEvents();
 deviceListScreen.hidden = true;
 unlockScreen.hidden = true;
 programScreen.hidden = true; 
 },
 bindEvents: function() {
 document.addEventListener('deviceready', this.onDeviceReady, false);
 document.getElementById("confirmInstantServings").addEventListener('click', this.unlock, false);
 document.getElementById("confirmDailyTime").addEventListener('click', this.unlock2, false);
 },
 goProgram: function() { //function when the program image is pressed
 	if(statusDiv.innerHTML == "Connected") {
 		unlockScreen.hidden = true;
 		programScreen.hidden = false;
 		programEditScreen.style.display = 'none';
 	}
 },
 goProgramFrom : function() { //function to go from the edit program screen to the program screen
 	programScreen.hidden = false;
 	programEditScreen.style.display = 'none';
 },
 goHome: function() { //function when the home image is pressed
 	if(statusDiv.innerHTML == "Connected") {
 		programScreen.hidden = true;
 		unlockScreen.hidden = false;	
 		programEditScreen.style.display = 'none';
 	}
 },
 goEdit: function() { //function to go to the edit program screen
 	programScreen.hidden = true;
 	programEditScreen.style.display = 'inline-block';
 	changeHtml();
 },
 onDeviceReady: function() { //initializes some buttons and starts scanning for devices 
 deviceList.ontouchstart = app.connect; // assume not scrolling
 refreshButton.ontouchstart = app.scan;
 disconnectButton.onclick = app.disconnect;
 programButton.onclick = app.goProgram;
 homeButton.onclick = app.goHome;
 editButton.onclick = app.goEdit;
 goBack.onclick = app.goProgramFrom;
 app.scan();
 },
 scan: function(e) {
 deviceList.innerHTML = ""; // clear the list
 app.showProgressIndicator("Scanning for Bluetooth Devices...");
 ble.startScan([SERVICE_UUID],
 app.onDeviceDiscovered,
 function() { alert("Listing Bluetooth Devices Failed"); }
 );
 // stop scan after 5 seconds
 setTimeout(ble.stopScan, 5000, app.onScanComplete);
 },
 onDeviceDiscovered: function(device) { //list the devices discovered with their rssi and id
 var listItem, rssi;
 app.showDeviceListScreen();
 console.log(JSON.stringify(device));
 listItem = document.createElement('li');
 listItem.dataset.deviceId = device.id;
 if (device.rssi) {
 rssi = "RSSI: " + device.rssi + "<br/>";
 } else {
 rssi = "";
 }
 listItem.innerHTML = device.name + "<br/>" + rssi + device.id;
 deviceList.appendChild(listItem);
 var deviceListLength = deviceList.getElementsByTagName('li').length;
 app.setStatus("Found " + deviceListLength +
 " device" + (deviceListLength === 1 ? "." : "s."));
 },
 onScanComplete: function() { //if no device discovered
 var deviceListLength = deviceList.getElementsByTagName('li').length;
 if (deviceListLength === 0) {
 app.showDeviceListScreen();
 app.setStatus("No Bluetooth Peripherals Discovered.");
 }
 },
 connect: function (e) { 
 var device = e.target.dataset.deviceId;
 app.showProgressIndicator("Requesting connection to " + device);
 ble.connect(device, app.onConnect, app.onDisconnect);
 },
 onConnect: function(peripheral) {
 app.connectedPeripheral = peripheral;
 app.showUnlockScreen();
 app.setStatus("Connected");
 ble.notify(peripheral.id, SERVICE_UUID, MESSAGE_UUID, app.onData);
 startSend();
 },
 onDisconnect: function(reason) {
 if (!reason) {
 reason = "Connection Lost";
 }
 app.hideProgressIndicator();
 app.showDeviceListScreen();
 app.setStatus(reason);
 },
 disconnect: function (e) {
 if (e) {
 e.preventDefault();
 }
 app.setStatus("Disconnecting...");
 ble.disconnect(app.connectedPeripheral.id, function() {
 app.setStatus("Disconnected");
 setTimeout(app.scan, 800);
 });
 },
 onData: function(buffer) {
 var message = bytesToString(buffer);
 app.setStatus(message);
 app.hideProgressIndicator();
 },
 unlock: function(e) { //sends immediate coffee servings
 var index = document.getElementById("selectServings");
 var code = index.options[index.selectedIndex].value;
 e.preventDefault(); // don't submit the form
 if (code === "") { return; } // don't send empty data
 app.showProgressIndicator();
 function success() {
 	app.hideProgressIndicator();
 }
 function failure (reason) {
 alert("Error sending code " + reason);
 app.hideProgressIndicator();
 }
 ble.write(
 app.connectedPeripheral.id,
 SERVICE_UUID,
 UNLOCK_UUID,
 stringToArrayBuffer(code),
 success, failure
 );
 },
 unlock2: function(e) { //function to send a formatted cron schedule string
 //variables for indexes of select container
 e.preventDefault(); // don't submit the form
 app.showProgressIndicator();
 function success() {
 	app.hideProgressIndicator();
 }
 function failure (reason) {
	 alert("Error sending code " + reason);
	 app.hideProgressIndicator();
 }
 var indexMinute = document.getElementById("slctDay2");
 var indexHour = document.getElementById("slctDay");
 var indexPM = document.getElementById("slctDay3"); 
 var indexDays = document.getElementById("selectWeeklyDay");
 var indexServing = document.getElementById("selectWeeklyServings");
 var indexOption = indexDays.options, count = 0;
 var message = indexMinute.selectedIndex + " ";
 var intHour = indexHour.selectedIndex;
 message = message.concat(getFormatHour(intHour, 
 	indexPM.options[indexPM.selectedIndex].text) + " * * "); 
 //check number of selected options
 for(var i=0; i < indexOption.length; i++) {
 	if(indexOption[i].selected) count++;
 }
 
 if(count==0) { alert("Select days of the week!");
	app.hideProgressIndicator();}
 else {
	message = message.concat(getFormatDays(count) + " -- ");
	message = message.concat(
	indexServing.options[indexServing.selectedIndex].text); //gets cron format with servings appended to it
	 if(!append(message + "@")) { //appends the message with @ at the end for future split function uses
	 	app.hideProgressIndicator();
	 	return;	
	 }
	 ble.write(
	 app.connectedPeripheral.id,
	 SERVICE_UUID,
	 UNLOCK_UUID,
	 stringToArrayBuffer("add -- "+message),
	 success, failure
	 );
	
 }
 },
 showProgressIndicator: function(message) {
 if (!message) { message = "Processing"; }
 scrim.firstElementChild.innerHTML = message;
 scrim.hidden = false;
 },
 hideProgressIndicator: function() {
 scrim.hidden = true;
 },
 showDeviceListScreen: function() {
 unlockScreen.hidden = true;
 deviceListScreen.hidden = false;
 programScreen.hidden = true;
 programEditScreen.style.display = 'none';
 app.hideProgressIndicator();
 statusDiv.innerHTML = "";
 },
 showUnlockScreen: function() {
 unlockScreen.hidden = false;
 deviceListScreen.hidden = true;
 programScreen.hidden = true;
 app.hideProgressIndicator();
 statusDiv.innerHTML = "";
 },
 setStatus: function(message){
 console.log(message);
 statusDiv.innerHTML = message;
 }
};
app.initialize();
