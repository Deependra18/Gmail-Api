require('dotenv').config();   //For Accessing the Env Variable 
const express=require('express'); 
const fs=require('fs'); //for working with files 
const https = require('https'); 
const querystring=require('querystring');  // for working with url( query string )
const app=express();
const Client_id=process.env.CLIENT_ID;//User client ID provided by the google console
const Client_secret=process.env.CLIENT_SECRET;//user client secret  provided by the google console
const redirect_uri="http://localhost:3000"; //a url where you can redirect after providing the permission to the  App
app.use(express.json());// body-parser for parsing the incoming post request data 
const port=process.env.PORT||3000;
const queryurl={
    scope:"https://www.googleapis.com/auth/gmail.send",
    access_type:'offline',
    include_granted_scopes:'true',
    response_type:"code",
    client_id:Client_id,
    redirect_uri,
    }
const url='https://accounts.google.com/o/oauth2/v2/auth?'+querystring.stringify(queryurl);  // a url from where afer redirecting, we will provide  permissions in consent screen
// this a get request by which we will redirect a specific url (by this url by using this client_id an App will be identified for Asking some permission for Allowing )
app.get('/auth',(req,res)=>{
       res.redirect(url);
})

// dummyUrl is for security Purpose when my App will be redirect some url and that url has some code and any other person can see this so that we will redirect in thus Url 
const dummyUrl='http://localhost/oauth2callback';

var post_options = {
    host: 'oauth2.googleapis.com',
    port: '443',
    path: '/token',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
};

// Set up the request
var post_req = https.request(post_options, function(res) {
    res.on('data', function (chunk) {
        console.log('Response: ' + chunk);
        fs.writeFileSync('Access-token.json',chunk);
    });
});

// after giving the permission by the User ,it will redirect to the redirect url which the Home(/) so it will request to this Endpoint  anf having A code which will use for generating the access_token
app.get('/',(req,res)=>{
       if(req.query.error=='access_denied')
       return res.send('Access denied');
       //if My URL have A code the it will go into this condition
       if(req.query.code)
       {

        const {code}=req.query;// By using object destructuring fetch the code which is given in the Url
        const code_url=querystring.stringify({code,
            client_id:Client_id,
            client_secret:Client_secret,
            redirect_uri,
            grant_type:'authorization_code'
        })
          // Make a Https Post Request for Accessing the access_token
          post_req.write(code_url);
          post_req.end();
          //And redirect to Any dummy Url for security purpose
         return  res.redirect(dummyUrl);
       }
       return res.send('You have to first Authorize');
       
})


//Afetr Accessing the Access_token and storing in A file we need to send a mail by using this endpoint and  by providing the post data
app.post('/mail', (req,res)=>{

     var access_token="//";
     // read the file and extract a access_token stored in json file 
     fs.readFile('Access-token.json', function(err, data){ 
         if(err)
         throw err; 
          access_token=JSON.parse(data).access_token;
     })
      
      setTimeout(()=>{
          // email data  
       var encodeMail=new Buffer.from(
        "to:" +req.body.to+"\n" +
        "subject:"+ req.body.subject +"\n\n" +
        // "The actual message text goes here"+
        req.body.message
       ).toString('base64').replace(/\+/g,'-').replace(/\//g,'_');
       
         
var post_options1 = {
    host: 'www.googleapis.com',
    port: '443',
    path: '/gmail/v1/users/me/messages/send',
    method: 'POST',
    headers: {
         "Authorization":"Bearer "+access_token,
        'Content-Type': "application/json"
    }
};

// Set up the https post request
var post_req1 = https.request(post_options1, function(res) {
    res.on('data', function (chunk) {
        console.log('Response1: ' + chunk);
    });
});
post_req1.write(JSON.stringify({"raw":encodeMail}));
post_req1.end();
// console.log("11",access_token);
res.send("successfully sent mail to "+req.body.to);
      },3000);
})

//
app.listen(port,()=>console.log('app is running on port :${port}'));
