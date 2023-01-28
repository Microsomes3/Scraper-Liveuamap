const chromium = require('chrome-aws-lambda');
const axios = require("axios");
const AWS = require("aws-sdk");
const moment = require("moment");

const documentClient = new AWS.DynamoDB.DocumentClient({
  region: 'eu-west-1',
  tableName: 'scrapedata'
})


function insertData(data) {
  const params = {
      TableName: 'scrapedata',
      Item: data
  }

  return documentClient.put(params).promise()
}

exports.handler = async (event, context, callback) => {


function convertHumanTimeToSeconds(humanTime) {

  try{
   
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
}catch(e){
  console.log("d", e, humanTime)
  return null;
}

}



  let result = null;
  let browser = null;

  const url = event.url || 'https://liveuamap.com';

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();

    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    await page.setRequestInterception(true);

    page.on('request', (request) => {
      if (['image', 'stylesheet'].indexOf(request.resourceType()) !== -1) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.goto(url,{
      waitUntil:"networkidle0"
    })
    
    const title= await page.title();
    // const data = await getEventData(url,page,1)

    var eventData= [];
  
    try{
    eventData = await page.evaluate(()=>{
      const all = [];
      const total = document.querySelectorAll(".event").length;
      document.querySelectorAll(".event").forEach(e=>{
          var title = null;
          var url = null;
          var id = null;
          var sourceLink = null;
          var b64icon = null;
          var time = null;
          var images = null;

          try{
            title= e.querySelector(".title").innerText
            url = e.getAttribute("data-link");
            id = e.getAttribute("data-id");
          }catch(e){}

          try{
            sourceLink = e.querySelector(".source-link").getAttribute("href")
          }catch(e){}

          try{
            b64icon = e.querySelector(".time.top-info img").getAttribute("src")
          }catch(e){}

          try{
            time = e.querySelector(".time.top-info .date_add").innerText
          }catch(e){}

          try{

            images=[];
            e.querySelectorAll("img").forEach((im)=>{
              images.push(im.getAttribute("src"))
            })

          }catch(e){}

          
          try{
          const dateRelative = e.querySelector(".date_add").innerHTML
          const imgs = e.querySelectorAll("img")
          const allImagesSource = [];
          const id = e.getAttribute("data-id");
          const t = e.querySelector(".time").innerHTML
          var source = null;
          try {
              source = e.querySelector(".source-link").innerHTML
          } catch (e) { }

          imgs.forEach(i => {
              allImagesSource.push(i.getAttribute('src'))
          })
        }catch(e){
          console.log(e);
        }


        if(title == null){
          
        }else{
          all.push({
            id:null,
            scrapeName:"liveuamap",
            scrapeTime: moment().format(),
            postId:id,
            title:title,
            postUrl:url,
            source:sourceLink,
            icon:b64icon,
            timeRelative:time,
            time:null,
            extra:null,
            country:null,
            uniqueKey:id,
            images:images
          })
        }
      })

      return {
        total:total,
        data:all
      };
    })
  }catch(e){
    console.log(e);
  }

  for(var i=0;i<eventData.data.length;i++){
    const e = eventData.data[i];
    const extra = await getExtraDetails(e.postUrl);
    eventData.data[i].time = convertHumanTimeToSeconds(eventData.data[i].timeRelative).then
    eventData.data[i].extra = extra;
    eventData.data[i].country = UrlMappings[url];

    eventData.data[i].id = uuidv4();
  }

  try{
  for(var i=0;i<eventData.data.length;i++){
    await insertData(eventData.data[i])
  }
}catch(e){
  console.log(e);
}
  

   result = {
    "pageTitle": title,
    "data":eventData,
   }

  } catch (error) {
    return callback(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return callback(null, JSON.stringify(result));
};

const UrlMappings = {
  'https://liveuamap.com': 'global', //done
  'https://syria.liveuamap.com': "syria",
  'https://ukraine.liveuamap.com': 'ukraine',
  'https://isis.liveuamap.com': 'isis', //done
  'https://asia.liveuamap.com': 'asia', //done
  'https://usa.liveuamap.com': 'usa',
  'https://dc.liveuamap.com': 'dc'
}


async function getExtraDetails(url) {
  console.log("getting extra details for ", url)
  return new Promise((resolve, reject) => {
      axios.get(url).then((d) => {
          const lat = d.data.split("$(document).ready(function(){")[1].split("lat")[1].split("=")[1].split("\n")[0].split(";")[0]
          const lng = d.data.split("$(document).ready(function(){")[1].split("lng")[1].split("=")[1].split("\n")[0].split(";")[0]
          const sourceLink = d.data.split('class="source-link"')[1].split("\n")[0].split("href=")[1].split("\n")[0].split(" ")[0].split('"')[1]
          const marker = d.data.split("marker-time")[1].split("data-src")[1].split('="')[1].split(">")[0].split('"')[0]
          resolve({
              sourceLink: sourceLink,
              marker: marker,
              lat: lat,
              lng: lng,
          })
      }).catch(err => reject(err))
  })
}





function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}