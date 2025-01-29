const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");

const API_KEY = "AIzaSyBY-rofFqZ4L8292pJgKTbQXlIB-JTedOI";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let userMessage = "";
const chatHistory = [];

//Function to create message elements 
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

const generateResponse = async (botMsgDiv) => {
    if (!botMsgDiv) {
        console.error("botMsgDiv is null or undefined");
        return;
    }

    let textElement = botMsgDiv.querySelector(".message-text");
    if (!textElement) {
        textElement = document.createElement("div");
        textElement.className = "message-text";
        botMsgDiv.appendChild(textElement);
    }

    // Add user message to the chat history
    chatHistory.push({
        role: "user",
        parts: [{ text: userMessage }]
    });

    try {
        // Send the chat history to the API to get a response
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        // Process the response text and display
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            console.error("Invalid API response structure");
            return;
        }
        textElement.textContent = responseText.replace(/\*\*([^*]+)\*\*/g, "$1").trim();

    } catch (error) {
        console.error("Error generating response:", error);
    }
};

//Handle the form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    userMessage = promptInput.value.trim();
    if(!userMessage) return;

    promptInput.value = "";

    //generate user message HTML and add in the chats container
    const userMsgHTML = `<p class="message-text"></p>`;
    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");

    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);

    setTimeout(() => {
        //generate bot message HTML and add in the chats conatiner after 500ms
        const botMsgHTML = `<img src="avatar.svg" class="avatar"><p class="message-text">Just a sec...</p>`;
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        generateResponse(botMsgDiv); 
    }, 200)


}

promptForm.addEventListener("submit", handleFormSubmit);