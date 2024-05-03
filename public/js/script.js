const navItems = document.querySelector("#nav__items");
const openNavBtn = document.querySelector("#open__nav-btn");
const closeNavBtn = document.querySelector("#close__nav-btn");

openNavBtn.addEventListener("click", () => {
  navItems.style.display = "flex";
  openNavBtn.style.display = "none";
  closeNavBtn.style.display = "inline-block";
});

const closeNav = () => {
  navItems.style.display = "none";
  openNavBtn.style.display = "inline-block";
  closeNavBtn.style.display = "none";
};
closeNavBtn.addEventListener("click", closeNav);

//slide
var swiper = new Swiper(".mySwiper", {
  slidesPerView: 1,
  spaceBetween: 30,
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },

  //Responsive Breakpoints
  breakpoints: {
    //width >= 600px
    600: {
      slidesPerView: 2,
    },
    1024: {
      slidesPerView: 3,
    },
  },
});
//aos

// chatbot
const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector(".chat-input span");

let userMessage = null;
//const API_KEY = "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"; // this
//let API_KEY = process.env.API_KEY;

const inputInitHeight = chatInput.scrollHeight;

const createChatLi = (message, className) => {
  const chatLi = document.createElement("li");
  chatLi.classList.add("chat", `${className}`);
  let chatContent = className === "outgoing" ? `<p></p>` : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
  chatLi.innerHTML = chatContent;
  chatLi.querySelector("p").textContent = message;
  return chatLi;
};

function analyzeResponse(response, eventData) {
  const parsed = JSON.parse(response);

  console.log("Reasoning: " + parsed.reasoning);

  let answer = parsed.answer;

  if (parsed.command.method) {
    try {
      refreshEvent(parsed.command, eventData);
    } catch (e) {
      console.log(e);
      console.log(answer + "yehey3");
      answer = "Could not perform the task on Google Calendar at the moment.";
    }
  }

  if (!answer) {
    answer = response;
  }

  return answer;
}

function refreshEvent(command, eventData) {
  switch (String(command.method)) {
    case "ADD":
      console.log("gone to add refresh");
      const stringi = JSON.stringify(eventData);
      const parsed = JSON.parse(stringi);

      // datetime to parse time and date
      const startTime = parsed.start.dateTime
        .split("T")[1]
        .split("-")[0];
      const endTime = parsed.end.dateTime.split("T")[1].split("-")[0];
      //time only hour and minute
      const startTimeUp =
        startTime.split(":")[0] + ":" + startTime.split(":")[1];
      const endTimeUp =
        endTime.split(":")[0] + ":" + endTime.split(":")[1];
      const name = parsed.summary + " (" + startTimeUp + "-" + endTimeUp + ")";
      const date = parsed.start.dateTime.split("T")[0];

      console.log(date)
      console.log(parsed.id)
      console.log(name)



      const eventSpecific = {
        id: parsed.id,
        name: name,
        date: date,
        type: "event",

      }

      $("#evoCalendar").evoCalendar("addCalendarEvent", eventSpecific);

      break;
    case "DELETE":
      console.log("gone to delete refresh");
      $("#evoCalendar").evoCalendar("removeCalendarEvent", eventData);
      console.log(eventData + "yehey9");

      break;
    case "UPDATE":
      console.log("gone to update refresh");

      console.log(eventData);

      var event0 = eventData[0];
      var eventid = eventData[1];

      $("#evoCalendar").evoCalendar("removeCalendarEvent", eventid);

      const stringi2 = JSON.stringify(event0);
      const parsed2 = JSON.parse(stringi2);

      // datetime to parse time and date
      const startTime2 = parsed2.start.dateTime
        .split("T")[1]
        .split("-")[0];
      const endTime2 = parsed2.end.dateTime.split("T")[1].split("-")[0];
      //time only hour and minute
      const startTimeUp2 =
        startTime2.split(":")[0] + ":" + startTime2.split(":")[1];
      const endTimeUp2 =
        endTime2.split(":")[0] + ":" + endTime2.split(":")[1];
      const name2 = parsed2.summary + " (" + startTimeUp2 + "-" + endTimeUp2 + ")";
      const date2 = parsed2.start.dateTime.split("T")[0];

      console.log(date2)
      console.log(parsed2.id)
      console.log(name2)



      const eventSpecific2 = {
        id: parsed2.id,
        name: name2,
        date: date2,
        type: "event",

      }

      $("#evoCalendar").evoCalendar("addCalendarEvent", eventSpecific2);


      break;
    case "GET":
      console.log("gone to get refresh");
      listofEvents(command);
      break;
    default:
      console.log("gone to default");
      break;
  }
}


async function generateResponse(chatElement, uMessage) {

  const messageElement = chatElement.querySelector("p");

  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userInput: uMessage }),

    });

    const data = await response.json();
    console.log(data)

    const answer = analyzeResponse(data.response, data.eventdata);

    const botMessage = answer;
    console.log(botMessage)
    // Add chat message to the chat history
    messageElement.textContent = botMessage.trim();




    //$("#demoEvoCalendar").evoCalendar("addCalendarEvent", events[curAdd]);

  } catch (error) {
    messageElement.classList.add("error");
    messageElement.textContent = "Oops! Something went wrong. Please try again.";
  }
  finally { chatbox.scrollTo(0, chatbox.scrollHeight) };
};

async function handleChat() {
  userMessage = chatInput.value.trim();
  if (!userMessage) return;

  chatInput.value = "";
  chatInput.style.height = `${inputInitHeight}px`;

  chatbox.appendChild(createChatLi(userMessage, "outgoing"));
  chatbox.scrollTo(0, chatbox.scrollHeight);

  setTimeout(() => {
    const incomingChatLi = createChatLi("Hmmm...", "incoming");
    chatbox.appendChild(incomingChatLi);
    chatbox.scrollTo(0, chatbox.scrollHeight);
    generateResponse(incomingChatLi, userMessage);
  }, 600);
};


chatInput.addEventListener("input", () => {
  chatInput.style.height = `${inputInitHeight}px`;
  chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
    e.preventDefault();
    handleChat();
  }
});

sendChatBtn.addEventListener("click", handleChat);
closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
