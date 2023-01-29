const AWS = require('aws-sdk');
const { table } = require('console');
const fs = require("fs");

const documentClient = new AWS.DynamoDB.DocumentClient({
    region: 'eu-west-1',
    tableName:'scrapedata'
});

(async ()=>{

    //get all items
    const params = {
        TableName: 'scrapedata'
    }

    const allPostData = [];

    const getData = async (lastEval)=>{
        var data;
        if(lastEval){
            data = await documentClient.scan({...params, ExclusiveStartKey: lastEval}).promise();
        }else{
            data = await documentClient.scan(params).promise();
        }
        allPostData.push(...data.Items);
        if(data.LastEvaluatedKey){
            await getData(data.LastEvaluatedKey);
        }else{
            console.log(allPostData.length);
        }
    }

    await getData(null);

    fs.writeFileSync("data.json",JSON.stringify(allPostData,null,2),(err)=>{})

    var allCountries = [];

    const duplicateTitles = {};

    allPostData.forEach((post)=>{
        if(!allCountries.includes(post.country)){
            allCountries.push(post.country);
        }
    })

    var allDuplicateAmount = 0;

    var IdsToDelete = [];

    allPostData.forEach((post)=>{
        console.log(post.title);

        if(duplicateTitles[post.title]){
            duplicateTitles[post.title] += 1;
            allDuplicateAmount += 1;
            IdsToDelete.push(post.id);
        }else{
            duplicateTitles[post.title] = 1;
        }
    })

    console.log(IdsToDelete);

    IdsToDelete.forEach(async (id)=>{
        const params = {
            TableName: 'scrapedata',
            Key: {
                "id": id
            }
        }
        await documentClient.delete(params).promise();
    })
    

    console.log("dups:",allDuplicateAmount)

    console.log("genuine:",allPostData.length - allDuplicateAmount)


    console.log(allPostData.length)


    // const data = await documentClient.scan(params).promise();

    // console.log(data);

})()