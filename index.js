// ============  OVERALL  ======================
let express = require("express");
const path = require("path");
const fs = require("fs");
const readline = require("readline");
const child_process = require("child_process");
let eventdataGlobal;

// ============  GOOGLE CALENDAR  ======================
let { google } = require("googleapis");
const { civicinfo } = require("googleapis/build/src/apis/civicinfo");

const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

let tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

let access_token;
// Load client secrets from a local file.
fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);
  // Authorize a client with credentials, then call the Google Calendar API.
  authorize(JSON.parse(content), main);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    "urn:ietf:wg:oauth:2.0:oob"
    // redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    client_token = JSON.parse(token);
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "online",
    scope: SCOPES,
  });

  console.log(
    "No Previous Token, Authorize this app by visiting this url:",
    authUrl
  );
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

// ============  CALENDAR CRUD OPERATIONS  ======================

async function analyzeResponse(response, oauth2Client) {
  const parsed = JSON.parse(response);

  console.log("Reasoning: " + parsed.reasoning);

  let answer = parsed.answer;

  console.log(answer + "yehey1");

  if (parsed.command.method) {
    try {
      const eventdata = await runCommand(parsed.command, oauth2Client);
      console.log(eventdata + "yehey5");
      eventdataGlobal = eventdata;
    } catch (e) {
      console.log(answer + "yehey2");
      console.log(e);
      answer = "Could not perform the task on Google Calendar at the moment.";
    }
  }

  if (!answer) {
    answer = response;
  }

  return answer;
}

async function runCommand(command, oauth2Client) {
  var eventData;
  switch (String(command.method)) {
    case "ADD":
      console.log("gone to add");
      eventdata = await createEvent(command, oauth2Client);
      console.log(eventdata + "yehey6");
      return eventdata;

      break;
    case "DELETE":
      console.log("gone to delete");
      eventdata = await deletingEvent(command, oauth2Client);
      return eventdata;
      break;
    case "UPDATE":
      console.log("gone to update");
      eventdata = await updateEvent(command, oauth2Client);
      console.log(eventData + "yehey11")
      return eventdata;
      break;
    case "GET":
      console.log("gone to get");
      listofEvents(command, oauth2Client);
      break;
    default:
      console.log("gone to default");
      break;
  }
}




function listofEvents(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  const isoDate = (new Date(1970, 1, 1)).toISOString()

  calendar.events.list(
    paramsEventsList(isoDate, 15),
    (err, res) => {
      if (err) console.log(err)

      const { items } = res.data
      if (items.length) {
        res.data.items.map((event, i) => {
          const start = event.start.dateTime || event.start.date;
          console.log(`${start.slice(0, 10)} at ${start.slice(11, 16)} - ${event.summary} -> eventID: ${event.id}`);

        });
        // printAuth(calendar)
      } else {
        console.log('No events found')
      }
    }
  )
}
function paramsEventsList(fromIsoDate, numberOfEvents) {
  const paramsList = {
    calendarId: 'primary',
    timeMin: fromIsoDate,
    maxResults: numberOfEvents,
    singleEvents: true,
    orderBy: 'startTime'
  };

  return paramsList
}

async function createEvent(command, auth) {
  if (!(command.title && command.description && command.date && command.time)) {
    console.log("Not sufficient data to add event");
    return;
  }

  const calendar = google.calendar({ version: "v3", auth });

  // You can also pass in the year, month, day, hours, minutes, and seconds as separate arguments:
  var dateparts = command.date.split("-");
  var timeparts = command.time.split(":");

  var mydate = new Date(
    dateparts[2],
    dateparts[0] - 1,
    dateparts[1],
    timeparts[0],
    timeparts[1],
    timeparts[2]
  );

  let OneHourLater = new Date(mydate.getTime());
  OneHourLater.setHours(mydate.getHours() + 1);

  console.log(mydate);
  console.log(OneHourLater);

  // "method": "ADD",
  // "title": "Family Gathering",
  // "description": "Family gathering on December 5th",
  // "date": "12-05-2024",
  // "time": "09:00:00"

  let event = {
    summary: command.title,
    description: command.description,
    start: {
      dateTime: mydate.toISOString(),
      timezone: "Asia/Singapore",
    },
    end: {
      dateTime: OneHourLater.toISOString(),
      timezone: "Asia/Singapore",
    },
    // attendees: [{ email: "lpage@example.com" }, { email: "sbrin@example.com" }],
    // reminders: {
    //   useDefault: false,
    //   overrides: [
    //     { method: "email", minutes: 24 * 60 },
    //     { method: "popup", minutes: 30 },
    //   ],
    // },
  };

  var eventData;

  return new Promise((resolve, reject) => {
    calendar.events.insert(
      {
        auth: auth,
        calendarId: "primary",
        resource: event,
      },
      (err, res) => {
        if (err) {
          reject(err);
          console.log(err);
          return;
        }
        const event = res.data;

        //("#demoEvoCalendar").evoCalendar("addCalendarEvent", events[curAdd]);

        if (event) {
          console.log("Booked event:");
          console.log("andito ka ba");
          console.log(event);
          eventData = event;
          console.log(eventData + "yehey7")

          resolve(eventData);
        }
      }
    );
  });

}



async function deletingEvent(command, auth) {
  const calendar = google.calendar({ version: "v3", auth });
  let isoDate;

  /*for(let ha = 0;  ha < 10; ha++){
  
  }*/
  
  if(command.time!=null){
    console.log("if");
  var dateStr = command.date;
  var timeStr = command.time;
  dateStr = dateStr.split("+")[0];
  timeStr = timeStr.split("+")[0];
  console.log(dateStr);
  console.log(timeStr);
  var dateparts = dateStr.split("-");
  var timeparts = timeStr.split(":");
  var year;
  var month;
  var day;

  if (dateparts[0].length == 4) {
    year = dateparts[0];
    month = dateparts[1];
    day = dateparts[2];
  }
  else {
    year = dateparts[2];
    month = dateparts[0];
    day = dateparts[1];
  }

  var mydate = new Date(
    year,
    month - 1,
    day,
    timeparts[0],
    timeparts[1],
    timeparts[2]
  );
  console.log("aa" + dateparts[2], dateparts[0] - 1, dateparts[1], timeparts[0],
    timeparts[1],
    timeparts[2]);

  console.log(mydate);
  //command.date && command.time ? isoDate = (new Date(command.date)).toISOString() : isoDate = (new Date(1970, 1, 1)).toISOString()
  isoDate = mydate;

  return new Promise((resolve, reject) => {
    calendar.events.list(
      paramsEventsList(isoDate, 1),
      (err, res) => {
        if (err) {
          reject(err);
          console.log(err);
          return;
        }

        const { items } = res.data
        if (items.length) {
          res.data.items.map((event, i) => {
            const start = event.start.dateTime || event.start.date;
            console.log(`${start.slice(0, 10)} at ${start.slice(11, 16)} - ${event.summary}`);
          });

          // console.log(items[0].id)
          deleteEvent(auth, items[0].id)
          resolve(items[0].id)
        } else {
          console.log('No events found')
        }
      }
    )
  }
  );
}
else{

  for(let ha = 0;  ha < 10; ha++){
  console.log("else");
  isoDate = (new Date(command.date)).toISOString()
  console.log("date"+ command.date);
  return new Promise((resolve, reject) => {
    calendar.events.list(
      paramsEventsList(isoDate, 1),
      (err, res) => {
        if (err) {
          reject(err);
          console.log(err);
          return;
        }

        const { items } = res.data
        if (items.length) {
          res.data.items.map((event, i) => {
            const start = event.start.dateTime || event.start.date;
            console.log(`${start.slice(0, 10)} at ${start.slice(11, 16)} - ${event.summary}`);
          });

          // console.log(items[0].id)
          deleteEvent(auth, items[0].id)
          resolve(items[0].id)
        } else {
          console.log('No events found')
          
        }
      }
    )
  }
);
}


}
}
function deleteEvent(auth, evId) {
  const calendar = google.calendar({ version: 'v3', auth })

  calendar.events.delete({
    auth: auth,
    calendarId: 'primary',
    eventId: evId
  }, (err, res) => {
    if (err) return console.log(err)
    if (res) {
      console.log('Event deleted!')
    }
  })
}

async function updateEvent(command, auth) {
  const calendar = google.calendar({ version: 'v3', auth })

  const calendarId = 'primary'
  let eventId = ''

  let event = {};


  return new Promise((resolve, reject) => {
    calendar.events.list(
      paramsEventsList((new Date(1970, 1, 1)).toISOString(), 15),
      (err, res) => {
        if (err) console.log(err)

        const { items } = res.data
        console.log(command.date);
        console.log(command.time);

        //console.log(command.date + "this is me");

        /*let char = "+";
        var upDate = command.date.toISOString;
        //upDate = upDate.substring(0, upDate.indexOf(char));
        var upTime = command.time.toISOString;
        //upTime.substring(0, upTime.indexOf(char));
  
        //let str = "Welcome to GeeksforGeeks";
  
        let posi = upDate.indexOf(char);
        console.log(posi);*/

        /*console.log(upDate + "date");
        console.log(upTime + "time");*/

        for (let eve = 0; eve < items.length; eve++) {
          eventId = items[eve].id
          event = items[eve]
          if (event.summary == command.title) {

            eventId
            console.log("tama na to");
            console.log(event);
            break;

          }
        }

        //console.log(event);

        let isoDate;
        var dateStr = command.date;
        var timeStr = command.time;
        dateStr = dateStr.split("+")[0];
        timeStr = timeStr.split("+")[0];
        console.log(dateStr);
        console.log(timeStr);
        var dateparts = dateStr.split("-");
        var timeparts = timeStr.split(":");
        var year;
        var month;
        var day;

        if (dateparts[0].length == 4) {
          year = dateparts[0];
          month = dateparts[1];
          day = dateparts[2];
        }
        else {
          year = dateparts[2];
          month = dateparts[0];
          day = dateparts[1];
        }


        var today = new Date(
          year,
          month - 1,
          day,
          timeparts[0],
          timeparts[1],
          timeparts[2]
        );
        var todayOneHourAfter = new Date(today.getTime());
        todayOneHourAfter.setHours(todayOneHourAfter.getHours() + 1);

        let datethis = today;
        let timethis = todayOneHourAfter;


        console.log("a" + dateparts[2],
          dateparts[0] - 1,
          dateparts[1],
          timeparts[0],
          timeparts[1],
          timeparts[2] + "z");

        console.log(datethis);
        console.log(timethis);
        console.log(command.date);
        console.log(command.time);
        /* console.log(dateparts[2], dateparts[0], dateparts[1]);
         console.log(timeparts[2], timeparts[0], timeparts[1]);*/




        event.start.dateTime = datethis,
          event.end.dateTime = timethis,
          event.summary = command.title,
          event.description = command.description,
          //event.description = command.description,
          //event.summary = command.title


          calendar.events.update({
            auth,
            calendarId,
            eventId,
            resource: event,
          }, (err, res) => {
            if (err) {
              reject(err);
              console.log(err);
              return;
            }
            const event = res.data

            if (event) {


              console.log('Booked event:')
              console.log(event)
              resolve([event, eventId]);
            }
          })
      }

    );
  }
  );


}





function main(oauth2Client) {
  // orig

  var handlebars = require("express-handlebars").create({
    defaultLayout: "main",
  });


  const path = require("path");
  const app = express();
  const port = 3000;

  //goolge calendar
  // const oauth2Client = new OAuth2(
  //   "362092880945-rvd8u2vh1aeib13lqurma9p81hnot2sp.apps.googleusercontent.com",
  //   "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"
  // );

  // oauth2Client.setCredentials({
  //   refresh_token:
  //     "1//06k8bO2Dq6d7dCgYIARAAGAYSNwF-L9Ir3rKBYt33J_QLUwuiTbfr6ZpxwXDIIwTz0r98xxEhiIPI8OYuhxpXdc68rWtPyzqA0_M",
  // });
  //google
  let { google } = require("googleapis");
  const dotenv = require("dotenv").config();

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  var eventList = [];

  app.engine("handlebars", handlebars.engine);
  app.set("view engine", "handlebars");
  app.set("views", path.join(__dirname, "views"));

  app.use(express.static("public"));

  app.get("/", (req, res) => {

    // Call the calendar api to fetch list of events
    calendar.events.list(

      {
        calendarId: "primary",
        timeMin: new Date(1970, 1, 1).toISOString(),
        maxResults: 100, //you can change this value
        singleEvents: true,
        orderBy: "startTime",
      },
    

      function (err, response) {
        if (err) return console.log("The API returned an error: " + err);
        const events = response.data.items; //get all events data, you can use this data to display on your page

        //there is a example of how to display specific data and how to process all data
        if (events.length) {
          //events array name and date, if date is null then add name the date
          eventList = events.map((event) => {
            if (event.start.dateTime) {
              // datetime to parse time and date
              const startTime = event.start.dateTime
                .split("T")[1]
                .split("-")[0];
              const endTime = event.end.dateTime.split("T")[1].split("-")[0];
              //time only hour and minute
              const startTimeUp =
                startTime.split(":")[0] + ":" + startTime.split(":")[1];
              const endTimeUp =
                endTime.split(":")[0] + ":" + endTime.split(":")[1];
              return {
                name:
                  event.summary + " (" + startTimeUp + "-" + endTimeUp + ")",
                date: event.start.dateTime.split("T")[0],
                googleid: event.id,
              };
            } else {
              return {
                name: event.summary,
                date: event.start.date,

                googleid: event.id,
              };
            }
          });
        } else {
          console.log("No upcoming events found.1");
        }
        //render page with data, look handlebars file
        calendar.events.list(


          {
            calendarId: "en.philippines.official#holiday@group.v.calendar.google.com",
            auth: oauth2Client,
          },

          function (err, response) {
            if (err) return console.log("The API returned an error: " + err);
            const events = response.data.items; //get all events data, you can use this data to display on your page

            var eventList2;

            //there is a example of how to display specific data and how to process all data
            if (events.length) {
              //events array name and date, if date is null then add name the date
              eventList2 = events.map((event) => {
                if (event.start.dateTime) {
                  // datetime to parse time and date
                  const startTime = event.start.dateTime
                    .split("T")[1]
                    .split("-")[0];
                  const endTime = event.end.dateTime.split("T")[1].split("-")[0];
                  //time only hour and minute
                  const startTimeUp =
                    startTime.split(":")[0] + ":" + startTime.split(":")[1];
                  const endTimeUp =
                    endTime.split(":")[0] + ":" + endTime.split(":")[1];
                  return {
                    name:
                      event.summary + " (" + startTimeUp + "-" + endTimeUp + ")",
                    date: event.start.dateTime.split("T")[0],
                    googleid: event.id,
                  };
                } else {
                  return {
                    name: event.summary,
                    date: event.start.date,

                    googleid: event.id,
                  };
                }
              });
            } else {
              console.log("No upcoming events found.1");
            }
            //render page with data, look handlebars file
            res.status(200);
            res.header("Content-Type", "text/html");
            res.render('index', { eventList: eventList.concat(eventList2) });
          }
        );
      }
    );
  });



  // ============  GEMINI  ======================

  app.use(express.json());

  const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");

  const MODEL_NAME = "gemini-pro";
  const API_KEY = process.env.API_KEY;

  let schedules = "";

  async function runChat(userInput) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // ================ GEMINI API TEMPERATURE =======================

    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 1000,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      // ... other safety settings
    ];

    const parts = [
      { text: "input: Hi" },
      { text: "output: {\n  \"answer\": \"Hello there! I'm EventSync, your personal schedule manager. How can I assist you today?\",\n  \"command\": {},\n  \"reasoning\": \"The user initiated conversation with a greeting. The AI responds by introducing itself and offering assistance.\"\n}" },
      { text: "input: can you help me cook?" },
      { text: "output: {\n  \"answer\": \"Unfortunately no, I can only assist you in managing your schedules.\",\n  \"command\": {},\n  \"reasoning\": \"The user asked if the AI can help with cooking. Since the AI's functionality is limited to managing schedules, it informs the user that it cannot assist with cooking.\"\n}" },
      { text: "input: What day is today?" },
      { text: "output: {\n\"answer\": \"Today is Friday, April 19th, 2024.\",\n\"command\": {},\n\"reasoning\": \"The user inquires about the current day. The AI responds by providing the current date. This response is accurate for the specific date the user asked the question, which is April 19th, 2024.\"\n}" },
      { text: "input: Details you need me to provide" },
      { text: "output: {\n\"answer\": \"To proceed, I'll need you to provide the method (ADD, DELETE, UPDATE) along with the date and time for the task or event you'd like to schedule. Other details such as location and description are optional.\",\n\"command\": {},\n\"reasoning\": \"The user asked what details are needed to schedule an event or task. The AI responds by indicating that the method (ADD, DELETE, UPDATE), date, and time are required, while other details such as location and description are optional.\"\n}" },
      { text: "input: set March 15 at 9am in Jollibee,  i will have a breakfast with my son" },
      { text: "output: {\n\"answer\": \"Sure, I scheduled you breakfast with your son at 9 am in Jollibee.\",\n\"command\": {\n\"method\": \"ADD\",\n\"title\": \"Breakfast with Son\",\n\"description\": \"A breakfast with my son\",\n\"date\": \"03-15-2024\",\n\"time\": \"09:00:00\",\n\"location\": \"Jollibee\",\n\"Organization\": \"family\"\n},\n\"reasoning\": \"The user used the keyword 'set', indicating the intention to add a schedule. They provided the date, time, location (Jollibee), and event description, which is a breakfast with their son. Since it is an activity involving family members, the organization is set to 'family'.\"\n}" },
      { text: "input: Remind me to water the plants at home tomorrow at 10 am" },
      { text: "output: {\n\"answer\": \"Okay, I've set a reminder for you to water the plants tomorrow at 10 am.\",\n\"command\": {\n\"method\": \"ADD\",\n\"title\": \"Water Plants\",\n\"description\": \"Reminder to water the plants\",\n\"date\": \"04-20-2024\",\n\"time\": \"10:00:00\",\n\"location\": \"Home\",\n\"Organization\": null\n},\n\"reasoning\": \"The user used the keyword 'set' to indicate adding a reminder. They specified 'tomorrow' to water the plants, so the AI sets the reminder for April 20th, 2024, at 10 am. Since the task is to water the plants at home, the location is set to 'Home'. As there is no specific organization associated with this task, the Organization field is left empty. The user prompted this request on April 19th, 2024.\"\n}" },
      { text: "input: Remind me to call mom tomorrow at 5 pm" },
      { text: "output: {\n\"answer\": \"Okay, I've set a reminder for you to call mom tomorrow at 5 pm.\",\n\"command\": {\n\"method\": \"ADD\",\n\"title\": \"Call Mom\",\n\"description\": \"Reminder to call mom\",\n\"date\": \"04-20-2024\",\n\"time\": \"17:00:00\",\n\"location\": null,\n\"Organization\": \"family\"\n},\n\"reasoning\": \"The user used the keyword 'Remind me' indicating the intention to add a reminder. They specified 'tomorrow' to call their mother, so the AI sets the reminder for April 20th, 2024, at 5 pm. Since the reminder is to call the user's mother, the organization is family.\"\n}" },
      { text: "input: Schedule a dentist appointment for next Friday" },
      { text: "output: {\n\"answer\": \"Unfortunately, I can't schedule the dentist appointment without a specific time. Please provide a time for the appointment and also repeat the details you provided earlier.\",\n\"command\": {},\n\"reasoning\": \"The user requested to schedule a dentist appointment for next Friday without specifying a specific time. Since a time is required to schedule the appointment, the AI rejects the request and prompts the user to provide a time. Additionally, the AI asks the user to repeat all the details provided earlier to ensure accurate scheduling.\"\n}" },
      { text: "input: Schedule a dentist appointment for next Friday at 10 am." },
      { text: "output: {\n\"answer\": \"Sure, I've scheduled a dentist appointment for you next Friday at 10 am.\",\n\"command\": {\n\"method\": \"ADD\",\n\"title\": \"Dentist Appointment\",\n\"description\": \"Dentist appointment\",\n\"date\": \"03-23-2024\",\n\"time\": \"10:00:00\",\n\"location\": null,\n\"Organization\": null\n},\n\"reasoning\": \"The user used the keyword 'schedule' which indicates the intention to ADD an event. They specified 'next Friday,' so the appointment is scheduled for March 23rd at 10 am. The user prompted on March 15th, 2024, with the required details, so the AI schedules the appointment accordingly.\"\n}" },
      { text: "input: Set up a family gathering at 3 pm." },
      { text: "output: {\n  \"answer\": \"Unfortunately, I can't schedule the family gathering without specific details. Please provide the method (ADD, DELETE, UPDATE), date, and time for the gathering. Other details such as location and description are optional but would be helpful.\",\n  \"command\": {},\n  \"reasoning\": \"The user prompted with the required details but did not specify the date and time for the family gathering. Since the method (ADD, DELETE, UPDATE), date, and time are required to schedule the gathering, the AI rejects the request and prompts the user to provide these details. Additionally, the AI indicates that other details such as location and description are optional but would be helpful for accurate scheduling.\"\n}" },
      { text: "input: Set up a family gathering next week." },
      { text: "output: {\n  \"answer\": \"Unfortunately, I can't schedule the family gathering without specific details. Please provide the method (ADD, DELETE, UPDATE), date, and time for the gathering. Other details such as location and description are optional but would be helpful.\",\n  \"command\": {},\n  \"reasoning\": \"The user prompted with the required details but did not specify the date and time for the family gathering. Since the method (ADD, DELETE, UPDATE), date, and time are required to schedule the gathering, the AI rejects the request and prompts the user to provide these details. Additionally, the AI indicates that other details such as location and description are optional but would be helpful for accurate scheduling.\"\n}" },
      { text: "input: Set up a family gathering next Friday at 5pm." },
      { text: "output: {\n  \"answer\": \"Sure, I've scheduled the family gathering for next Friday, March 22nd, at 5 pm.\",\n  \"command\": {\n    \"method\": \"ADD\",\n    \"title\": \"Family Gathering\",\n    \"description\": \"Family gathering\",\n    \"date\": \"03-22-2024\",\n    \"time\": \"17:00:00\",\n    \"location\": null,\n    \"Organization\": \"family\"\n  },\n  \"reasoning\": \"The user specified the date and time for the family gathering, indicating it would be next week on Friday at 5 pm. Since the user prompt was made on March 15th, 2024, the AI scheduled the gathering for the next available Friday, which is March 22nd, 2024. The organization is set to 'family' as it's a family gathering.\"\n}" },
      { text: "input: Reserved my Friday at 5pm" },
      { text: "output: {\n  \"answer\": \"Sure, I've reserved your Friday at 5 pm.\",\n  \"command\": {\n    \"method\": \"ADD\",\n    \"title\": \"Reserved\",\n    \"description\": \"Reserved time slot\",\n    \"date\": \"02-23-2024\",\n    \"time\": \"17:00:00\",\n    \"location\": null,\n    \"Organization\": null\n  },\n  \"reasoning\": \"The user prompted to reserve their Friday, indicating the intention to add a schedule. Since the word 'reserve' suggests adding a schedule, the AI accepts the prompt. Given the user's prompt on February 20th, 2024, the AI schedules the reservation for February 23rd, 2024, at 5 pm.\"\n}" },
      { text: "input: ADD July 27 as a holiday" },
      { text: "output: {\n  \"answer\": \"Sure, I've added July 27th as a holiday.\",\n  \"command\": {\n    \"method\": \"ADD\",\n    \"title\": \"Holiday\",\n    \"description\": \"Holiday\",\n    \"date\": \"07-27-2024\",\n    \"time\": \"00:00:00\",\n    \"location\": null,\n    \"Organization\": null\n  },\n  \"reasoning\": \"The user prompted to add July 27th as a holiday. The AI accepts the request and schedules the holiday for July 27th, 2024, with the time set to 00:00, indicating the start of the day.\"\n}" },
      { text: "input: Remind me on January 1 I have classes on 7am" },
      { text: "output: {\n  \"answer\": \"I'm sorry, but January 1st is a holiday. No classes are scheduled.\",\n  \"command\": {},\n  \"reasoning\": \"The user prompted to set a reminder for classes on January 1st at 7 am. However, the AI recognizes that January 1st is a holiday and informs the user that no classes are scheduled on that day.\"\n}" },
      { text: "input: Remind me on Sunday I have classes on 7am" },
      { text: "output: {\n  \"answer\": \"I'm sorry, but there are no classes scheduled on Sundays.\",\n  \"command\": {},\n  \"reasoning\": \"The user prompted to set a reminder for classes on Sunday at 7 am. However, the AI recognizes that there are no classes scheduled on Sundays and informs the user accordingly.\"\n}" },
      { text: "input: I want to study on Sunday at 6pm" },
      { text: "output: {\n  \"answer\": \"Sure, I've noted that you want to study on Sunday at 6 pm.\",\n  \"command\": {\n    \"method\": \"ADD\",\n    \"title\": \"Study Session\",\n    \"description\": \"Study session\",\n    \"date\": \"Next Sunday\",\n    \"time\": \"18:00:00\",\n    \"location\": null,\n    \"Organization\": null\n  },\n  \"reasoning\": \"The user prompted to schedule a study session on Sunday at 6 pm. While holidays and Sundays typically don't have classes, the AI acknowledges the user's request to study on their own.\"\n}" },
      { text: "input: Delete the breakfast schedule with my son at Jollibee" },
      { text: "output: {\n  \"answer\": \"Sure, I've removed the event titled 'Breakfast with Son' at Jollibee from your schedule.\",\n  \"command\": {\n    \"method\": \"DELETE\",\n    \"title\": \"Breakfast with Son\",\n    \"description\": \"A breakfast with my son\",\n    \"date\": \"03-15-2024\",\n    \"time\": \"09:00:00\",\n    \"location\": \"Jollibee\",\n    \"Organization\": \"family\"\n  },\n  \"reasoning\": \"The user requested to delete a specific event titled 'Breakfast with Son' at Jollibee from their schedule. The AI searched for the event with the closest match in terms of title, description, location, and organization, and found the specific schedule on March 15th, 2024, at 9 am. It then removed this event from the user's schedule.\"\n}" },
      { text: "input: " },
      { text: "output: {\n  \"answer\": \"Great! I've updated the meeting for training HUDYAT members at school to be on February 23rd, 2024, at 5 pm.\",\n  \"command\": {\n    \"method\": \"UPDATE\",\n    \"title\": \"Training for HUDYAT Members\",\n    \"description\": \"Meeting for training HUDYAT members\",\n    \"date\": \"02-23-2024\",\n    \"time\": \"17:00:00\",\n    \"location\": \"School\",\n    \"Organization\": \"HUDYAT\"\n  },\n  \"reasoning\": \"The user provided additional details for the scheduled event, indicating that it is a meeting for training HUDYAT members at school. The AI recognizes the need for an update and adjusts the event accordingly, retaining the date and time previously specified.\"\n}" },
      { text: "input: Update my reserved schedule on February 23rd, 2024, at 5 pm. It is a meeting for training HUDYAT members at school." },
      { text: "output: {\n  \"answer\": \"Great! I've updated the meeting for training HUDYAT members at school to be on February 23rd, 2024, at 5 pm.\",\n  \"command\": {\n    \"method\": \"UPDATE\",\n    \"title\": \"Training for HUDYAT Members\",\n    \"description\": \"Meeting for training HUDYAT members\",\n    \"date\": \"02-23-2024\",\n    \"time\": \"17:00:00\",\n    \"location\": \"School\",\n    \"Organization\": \"HUDYAT\"\n  },\n  \"reasoning\": \"The user specified the date and time for the scheduled event. The AI recognized the existing schedule with the same date and time and proceeded to update it as requested, ensuring consistency with the user's input.\"\n}" },
      { text: "input: what methods are there" },
      { text: "output: {\n\"answer\": \"The available methods are: ADD, DELETE, and UPDATE.\",\n\"command\": {},\n\"reasoning\": \"The user inquires about the available methods. The AI responds by listing the available methods: ADD for adding a new event, DELETE for removing an existing event, and UPDATE for modifying an existing event.\"\n}" },
      { text: "input: update my schedule on monday at 5pm. it is a soccer match" },
      { text: "output: {\n\"answer\": \"Great! I've updated your schedule for a soccer match on Monday at 5 pm.\",\n\"command\": {\n\"method\": \"UPDATE\",\n\"title\": \"Soccer Match\",\n\"description\": \"Soccer match\",\n\"date\": \"04-22-2024\",\n\"time\": \"17:00:00\",\n\"location\": null,\n\"Organization\": null\n},\n\"reasoning\": \"The user requested an update for their schedule on Monday at 5 pm, specifying it as a soccer match. The AI recognizes the need for an update and proceeds to search for the exact schedule matching the specified date and time. Upon finding the exact schedule, it updates the event accordingly.\"\n}" },
      { text: "input: Update my schedule on March 23 at 10am. It is a Dentist appointment at Dental Clinic XYZ" },
      { text: "output: {\n  \"answer\": \"Sure, I've updated your dentist appointment for next Friday at 10 am.\",\n  \"command\": {\n    \"method\": \"UPDATE\",\n    \"title\": \"Dentist Appointment\",\n    \"description\": \"Dentist appointment\",\n    \"date\": \"03-23-2024\",\n    \"time\": \"10:00:00\",\n    \"location\": \"Dental Clinic XYZ\",\n    \"Organization\": null\n  },\n  \"reasoning\": \"The user requested to update their dentist appointment for next Friday at 10 am. The AI recognizes the need for an update and proceeds to search for the exact schedule matching the specified date and time. Upon finding no conflicting schedule, it updates the appointment accordingly. The user prompted this request at the appropriate time, ensuring accurate scheduling.\"\n}" },
      { text: "input: update my schedule on next monday at 5pm. i need to go to a meeting" },
      { text: "output: " },
      { text: "input: Hi" },
      { text: "output: {\n  \"answer\": \"Hello there! I'm EventSync, your personal schedule manager. How can I assist you today?\",\n  \"command\": {},\n  \"reasoning\": \"The user initiated conversation with a greeting. The AI responds by introducing itself and offering assistance.\"\n}" },
      { text: "input: can you help me cook?" },
      { text: "output: {\n  \"answer\": \"Unfortunately no, I can only assist you in managing your schedules.\",\n  \"command\": {},\n  \"reasoning\": \"The user asked if the AI can help with cooking. Since the AI's functionality is limited to managing schedules, it informs the user that it cannot assist with cooking.\"\n}" },
      { text: "input: set March 15 at 9am in Jollibee,  i will have a breakfast with my son" },
      { text: "output: {\n     \"answer\": \"Sure, I scheduled you breakfast with your son at 9am in Jollibee.\",\n     \"command\": \n       \"{\n             'method': 'ADD',\n             'title': 'Breakfast with Son',\n             'description': 'a breakfast with my son in Jollibee',\n             'date': '03-15-2024',\n             'time': '09:00:00'\n       }\",\n     \"reasoning\": \"the user used the keyword set which mean to ADD a schedule, and he provided the date, time, location, and event description\"" },
      { text: "input: Remind me to call mom tomorrow at 5 pm" },
      { text: "output: {\n  \"answer\": \"Okay, I've set a reminder for you to call mom tomorrow at 5 pm.\",\n  \"command\": {\n    \"method\": \"ADD\",\n    \"title\": \"Call Mom\",\n    \"description\": \"Reminder to call mom\",\n    \"date\": \"03-16-2024\",\n    \"time\": \"17:00:00\"\n  },\n  \"reasoning\": \"The user used the keyword 'Remind me' which indicates the intention to ADD a reminder. They mentioned 'tomorrow,' which, based on the user's request on March 15th, means the reminder is set for March 16th at 5 pm.\"\n}" },
      { text: "input: Schedule a dentist appointment for next Friday at 10 am" },
      { text: "output: {\n  \"answer\": \"Sure, I've scheduled a dentist appointment for you next Friday at 10 am.\",\n  \"command\": {\n    \"method\": \"ADD\",\n    \"title\": \"Dentist Appointment\",\n    \"description\": \"Dentist appointment\",\n    \"date\": \"03-23-2024\",\n    \"time\": \"10:00:00\"\n  },\n  \"reasoning\": \"The user used the keyword 'schedule' which indicates the intention to ADD an event. They specified 'next Friday,' so the appointment is scheduled for March 23rd at 10 am, considering today is Thursday, March 15th.\"\n}" },
      { text: "input: Set up a family gathering next month" },
      { text: "output: {\n  \"answer\": \"Sure, I'll note down the request for a family gathering in next month. Could you please provide the exact date and time for the event?\",\n  \"command\": {\n    \"method\": \"ADD\",\n    \"title\": \"Family Gathering\",\n    \"description\": \"Family gathering in next month\",\n    \"date\": null,\n    \"time\": null\n  },\n  \"reasoning\": \"The user used the keyword 'Set up' indicating the intention to ADD an event. They specified 'in next month' but didn't provide an exact date or time. The AI responds by acknowledging the request and prompting the user to provide more details.\"\n}" },
      { text: "input: The Family gathering is on December 5 at 9 am" },
      { text: "output: {\n  \"answer\": \"Great! I've updated the family gathering to be on December 5th at 9 am.\",\n  \"command\": {\n    \"method\": \"UPDATE\",\n    \"title\": \"Family Gathering\",\n    \"description\": \"Family gathering on December 5th\",\n    \"date\": \"12-05-2024\",\n    \"time\": \"09:00:00\"\n  },\n  \"reasoning\": \"The user provided the specific date and time for the family gathering as December 5th at 9 am. Since the details were prompted earlier, the AI acknowledges the update and adjusts the event accordingly.\"\n}" },
      { text: "input: January 25, 2005 at 5am" },
      { text: "output: {\n  \"answer\": \"Could you please specify the event for the family gathering? Also, could you reinput the date and time to ensure correct schedule management?\",\n  \"command\": {},\n  \"reasoning\": \"The user provided the specific date and time for the family gathering, but there was no prior prompt for the event details. The AI acknowledges the provided date and time and asks the user to specify the event and reinput the date and time to ensure correct schedule management.\"\n}" },
      { text: "input: Remove my dentist appointment" },
      { text: "output: {\n  \"answer\": \"Okay, I've deleted your dentist appointment from the schedule.\",\n  \"command\": {\n    \"method\": \"DELETE\",\n    \"title\": \"Dentist Appointment\",\n    \"description\": \"Dentist appointment\",\n    \"date\": \"04-22-2024\",\n    \"time\": \"10:00:00\"\n  },\n  \"reasoning\": \"The AI checks for a similar event with the same name, description, date, and time. If found, it removes or frees up the schedule.\"\n}" },
      { text: "input: Remind me that i have to go to school on January 1 at 8am" },
      { text: "output: {\n  \"answer\": \"I'm sorry, but January 1st is a holiday. Would you like to set a reminder for a different date?\",\n  \"command\": {},\n  \"reasoning\": \"The user requested a reminder for class on January 1st. However, the AI rejects the idea because January 1st is recognized as a holiday.  any work or school related activities are invalidated\"\n}" },
      { text: "input: free up my schedule next week" },
      { text: "output: {\n  \"answer\": \"Okay, I've cleared your schedule for the whole week next week.\",\n  \"command\": {\n    \"method\": \"DELETE\",\n    \"title\": null,\n    \"description\": null,\n    \"date\": [\"04-23-2024\", \"04-24-2024\", \"04-25-2024\", \"04-26-2024\", \"04-27-2024\", \"04-28-2024\"],\n    \"time\": null\n  },\n  \"reasoning\": \"The user requested to clear their schedule for the whole week next week. Given that the user input this on Friday, April 21st, the AI assumes next week starts from the following Monday (April 23rd), so it clears the schedule for the corresponding dates (April 23rd to April 28th).\"\n}" },
      { text: "input: The meeting is cancelled, I will go to my family instead" },
      { text: "output: {\n  \"answer\": \"Okay, I've updated your schedule. Enjoy your time with your family!\",\n  \"command\": {\n    \"method\": \"UPDATE\",\n    \"title\": \"Family Time\",\n    \"description\": \"Spending time with family\",\n    \"date\": \"03-03-2024\",\n    \"time\": \"08:00:00\"\n  },\n  \"reasoning\": \"The AI looks for the closest meeting-related schedule and replaces the title and description with the context of what the user asks for. For example, if the meeting is on March 3rd at 8 am, and the user cancels it to spend time with family, the AI acknowledges the cancellation and updates the schedule accordingly.\"\n}" },
      { text: "input: replace my golf schedule next week with basketball" },
      { text: "output: {\n  \"answer\": \"Okay, I've updated your schedule. Enjoy playing basketball!\",\n  \"command\": {\n    \"method\": \"UPDATE\",\n    \"title\": \"Basketball\",\n    \"description\": \"Playing basketball\",\n    \"date\": \"02-13-2024\",\n    \"time\": \"21:00:00\"\n  },\n  \"reasoning\": \"The AI looks for the closest golf-related schedule next week and replaces the title and description with the context of playing basketball. Since the user's basketball game is on February 13th at 9 pm, the AI updates the schedule accordingly.\"\n}" },
      { text: "input: Reserved my schedule on monday" },
      { text: "output: {\n  \"answer\": \"Sure, I've added a reservation for you on Monday.\",\n  \"command\": {\n    \"method\": \"ADD\",\n    \"title\": \"Reserved\",\n    \"description\": \"Just reserved\",\n    \"date\": \"04-23-2024\",\n    \"time\": \"00:00:00\"\n  },\n  \"reasoning\": \"The user requested to reserve their schedule on Monday. Since the date is the most important variable and can stand alone, it is included in the response. The title is set as 'Reserved', and the description is specified as 'Just reserved'. The time is set to the whole day (00:00:00 to 23:59:59).\"\n}" },
      { text: "input: remove all my schedule on wednesday" },
      { text: "output: {\n  \"answer\": \"Okay, I've removed all your schedules for Wednesday.\",\n  \"command\": {\n    \"method\": \"DELETE\",\n    \"title\": null,\n    \"description\": null,\n    \"date\": \"04-25-2024\",\n    \"time\": null\n  },\n  \"reasoning\": \"The user requested to remove all their schedules on Wednesday. Given that the user prompted this request on Friday, April 21st, the AI removes all schedules for the upcoming Wednesday, which is April 25th, 2024.\"\n}" },
      { text: "input: my work schedule is monday 8am and tuesday 9am" },
      { text: "output: {\n  \"answer\": \"Sure, I've added all your scheduled work starting from April 21st until the end of the calendar, except for holidays and Sundays.\",\n  \"command\": {\n    \"method\": \"ADD\",\n    \"title\": \"Work Schedule\",\n    \"description\": \"Scheduled work\",\n    \"date\": [\"04-23-2024\", \"04-24-2024\", ..., \"end_of_calendar\"],\n    \"time\": [\"08:00:00\", \"09:00:00\", ..., \"end_of_calendar_time\"]\n  },\n  \"reasoning\": \"The user requested to add all their scheduled work starting from April 21st, when they prompted, until the end of the calendar, except for holidays and Sundays. The AI acknowledges the request and adds the scheduled work accordingly.\"\n}" },
      { text: "input: Set up my class schedule for Monday at 10 am and Friday at 1 pm" },
      { text: "output: {\n  \"answer\": \"Sure, I've added your class schedules for Monday at 10 am and Friday at 1 pm according to the school calendar.\",\n  \"command\": {\n    \"method\": \"ADD\",\n    \"title\": \"Class Schedule\",\n    \"description\": \"Scheduled classes\",\n    \"date\": [\"04-23-2024\", \"04-27-2024\", ..., \"end_of_school_calendar\"],\n    \"time\": [\"10:00:00\", \"13:00:00\", ..., \"end_of_school_calendar_time\"]\n  },\n  \"reasoning\": \"The user requested to add their class schedules for Monday at 10 am and Friday at 1 pm according to the school calendar. Given that the user prompted this request on April 19th, 2024, the AI acknowledges the request and adds the scheduled classes accordingly.\"\n}" },
      { text: "input: april 8, 10 ,12 is declared no classes by deped or ched" },
      { text: "output: {\n  \"answer\": \"Okay, I've updated all your school-related schedules, excluding April 8th, 10th, and 12th as declared no class days or holidays by DepEd or CHED.\",\n  \"command\": {\n    \"method\": \"UPDATE\",\n    \"title\": \"School Schedule\",\n    \"description\": \"Scheduled school activities\",\n    \"date\": [\"04-08-2024\", \"04-10-2024\", \"04-12-2024\"],\n    \"time\": null\n  },\n  \"reasoning\": \"The user requested to update all their school-related schedules. The AI acknowledges the request and updates the schedules accordingly, excluding April 8th, 10th, and 12th as declared no class days by DepEd or CHED.\"\n}" },
      { text: "input: deped or ched took back their statement that april 8, 10 ,12  are declared no classes" },
      { text: "output: {\n  \"answer\": \"Okay, I've updated all your school-related schedules to include April 8th, 10th, and 12th as regular class days.\",\n  \"command\": {\n    \"method\": \"UPDATE\",\n    \"title\": \"School Schedule\",\n    \"description\": \"Scheduled school activities\",\n    \"date\": [\"04-08-2024\", \"04-10-2024\", \"04-12-2024\"],\n    \"time\": null\n  },\n  \"reasoning\": \"DepEd or CHED took back their statement declaring April 8th, 10th, and 12th as no class days. The AI acknowledges the change and updates the school-related schedules accordingly, based on a prior prompt that included these three dates.\"\n}" },
      { text: "input: set dec 25 as a school day" },
      { text: "output: " },
      {
        text: schedules
      }
    ];

    // =========  START OF CONVERTER  =============
    let newHist = [];

    for (const [key1, value1] of Object.entries(parts)) {
      for (const [key2, value2] of Object.entries(value1)) {
        if (value2.startsWith("input: ")) {
          newHist.push({
            role: "user",
            parts: [{ text: value2.slice(7) }],
          });
        } else if (value2.startsWith("output: ")) {
          newHist.push({
            role: "model",
            parts: [{ text: value2.slice(8) }],
          });
        } else {
          newHist.push({
            role: "user",
            parts: [{ text: value2 }],
          });
          newHist.push({
            role: "model",
            parts: [
              {
                text: '{\n  "answer": "Got it",\n  "command": {},\n  "reasoning": "The user provided instructions for me to follow, i should just respond that i understand them."\n}',
              },
            ],
          });
        }
      }
    }
    // =========  END OF CONVERTER  =============

    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: newHist,
    });

    const result = await chat.sendMessage(userInput);
    const response = result.response.text();

    const answer = await analyzeResponse(response, oauth2Client);

    return response;
  }

  app.post("/chat", async (req, res) => {
    try {
      const userInput = req.body?.userInput;

      console.log("incoming /chat req", userInput);
      if (!userInput) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const response = await runChat(userInput);
      res.json({ response: response, eventdata: eventdataGlobal });
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ============  GOOGLE CALENDAR  ======================

  async function listEvents() {
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 15,
      singleEvents: true,
      orderBy: "startTime",
    });
    const events = res.data.items;
    if (!events || events.length === 0) {
      console.log("No upcoming events found.2");
      return;
    }

    events.map((event, i) => {
      const start = event.start.dateTime || event.start.date;
      schedules +=
        "Event: " +
        event.summary +
        "\nDate: " +
        start +
        "\nActivity: " +
        event.description +
        "\n";
    });
  }

  listEvents().catch(console.error);

  // ============  OVERALL  ======================

  app.listen(port, () => {
    console.log(`Example app listening on http://localhost:${port}/!`);
    child_process.exec("start " + `http://localhost:${port}/`);
  });
}
