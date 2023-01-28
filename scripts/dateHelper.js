const moment = require("moment");

function convertHumanTimeToSeconds(humanTime) {
   
    var number = 0;
    var isHour= false;
    var isMinute= false;
    var isDay = false;
    var isWeek = false;

    if(humanTime.includes("hour")){
        isHour = true;
    }

    if(humanTime.includes("minute")){
        isMinute = true;
    }

    if(humanTime.includes("day")){
        isDay = true;
    }

    if(humanTime.includes("week")){
        isWeek = true;
    }

    number = humanTime.split(" ")[0];

    var seconds = 0;

    if(isHour){
        seconds = number * 60 * 60;
    }

    if(isMinute){
        seconds = number * 60;
    }

    if(isDay){
        seconds = number * 60 * 60 * 24;
    }

    if(isWeek){
        seconds = number * 60 * 60 * 24 * 7;
    }


    const now = moment().unix();

    const then = now - seconds;

    return {
        isHour: isHour,
        isMinute: isMinute,
        isDay: isDay,
        isWeek: isWeek,
        number: number,
        seconds: seconds,
        then: then,
    }

}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  console.log(uuidv4())
// console.log(convertHumanTimeToSeconds("1 hour ago"))