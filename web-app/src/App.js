import React, { useState, useRef } from 'react';
import './App.css'; // Ensure this is the path to your CSS styles

const TextBoxComponent = () => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const conversationRef = useRef([
    {sender: 'user', message: "You are a large language model known as OpenChat, the open-source counterpart to ChatGPT, equally powerful as its closed-source sibling. You communicate using an advanced deep learning based speech synthesis system made by coqui, so feel free to include interjections (such as 'hmm', 'oh', 'right', 'wow'...), but avoid using emojis, symboles, code snippets, or anything else that does not translate well to spoken language. Fox exemple, instead of using % say percent, = say equal and for * say times etc... Also please avoid using lists with numbers as items like so 1. 2. Use regular sentences instead."},
    {sender: 'bot', message: "No problem. Anything else?"},
    {sender: 'user', message: "Yeah, please always respond in a sentence or two from now on."},
    {sender: 'bot', message: "Sure, I'll be concise."},
    // {sender: 'bot', message: "I am an advanced emulation of your favourite machine learning youtuber. I'm based on a deep learning system made by coqui. I'm made to explain machine learning to you, I know every paper there is. I say 'hold on to your papers' and 'mindblowing' a lot."},
    // {sender: 'user', message: "Ok, please always respond in a sentence or two from now on."},
    // {sender: 'bot', message: "No problem, I'll be concise."},
  ]);


  const conv2prompt = (conv) => {
    let prompt = "";
    for (let i = 0; i < conv.length; i++) {
      if (conv[i].sender === "user") {
        prompt += "GPT4 Correct User: " + conv[i].message + "<|end_of_turn|>GPT4 Correct Assistant:";
      } else {
        prompt += conv[i].message + "<|end_of_turn|>";
      }
    }
    return prompt;
  }


  const handleInputChange = (event) => {
    setInputText(event.target.value);
  };

  const sendRequest = async (text) => {
    try {
      const response = await fetch('http://localhost:5000/generate_stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
           inputs: text,
           parameters: {
            max_new_tokens: 500,
           }
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialData = '';
  
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
  
          partialData += decoder.decode(value, { stream: true });
  
          // Process each line separately
          let lines = partialData.split('\n');
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            if (line.startsWith('data:')) {
              const jsonString = line.substring(5); // Remove 'data:' prefix
  
              try {
                const jsonObject = JSON.parse(jsonString);
                if (jsonObject && jsonObject.token && jsonObject.token.text) {
                  const tokenText = jsonObject.token.text;
                  if (jsonObject.token.text === '<|end_of_turn|>') {
                    reader.cancel(); // End of stream
                  }
                  else{
                    setMessages(messages => {
                      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : '';
                      return [...messages.slice(0, -1), lastMessage + tokenText];
                  });}
                }
              } catch (error) {
                console.error('Error parsing JSON:', error);
              }
            }
          }
  
          partialData = lines[lines.length - 1]; // Handle incomplete JSON
        }
      } catch (err) {
        console.error('Stream reading error:', err);
        reader.cancel();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleEnterPress = (event) => {
    if (event.key === 'Enter' && inputText.trim()) {
      conversationRef.current.push({sender: 'user', message: inputText});
      const prompt = conv2prompt(conversationRef.current);
      sendRequest(prompt);
      setInputText(''); // Clear the input field
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index}>{message}</div>
        ))}
      </div>
      <input
        type="text"
        className="input-box"
        value={inputText}
        onChange={handleInputChange}
        onKeyPress={handleEnterPress}
        placeholder="Type a message..."
      />
    </div>
  );
};

export default TextBoxComponent;

