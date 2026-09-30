\# 💬 PulseChat — Real-Time Messaging Platform



PulseChat is a full-stack real-time messaging platform developed as part of my \*\*Full-Stack Web Development Internship at Prodigy InfoTech\*\*.



The application allows users to create accounts, securely sign in, join chat rooms, create private conversations, and exchange messages in real time through WebSocket communication.



\---



\## 🚀 Live Features



\- 🔐 User registration and secure login

\- 🔑 JWT-based authentication

\- 🍪 HTTP-only authentication cookies

\- 👤 User account management

\- 💬 Real-time text messaging

\- 🌐 WebSocket-based communication

\- 🏠 Public chat rooms

\- 🔒 Private conversations

\- ➕ Create private chats

\- 🔗 Private chat invite codes

\- 👥 Room membership management

\- 🟢 Online user presence

\- 📡 Real-time room presence updates

\- 💾 MongoDB message persistence

\- 📜 Chat history

\- 🚪 Join and leave chat rooms

\- 📱 Responsive chat interface



\---



\## 🖥️ Project Showcase



\### 🔐 Sign In



Users can securely sign in to their PulseChat account using their registered email and password.



!\[PulseChat Sign In](./screenshots/01-signin.png)



\---



\### 🏠 Dashboard



The PulseChat dashboard provides access to available conversations, chat rooms, private conversations, online status and real-time connection information.



!\[PulseChat Dashboard](./screenshots/02-dashboard.png)



\---



\### ➕ Create Private Chat



Users can create a private conversation and generate an invite code that can be shared with another user to join the conversation.



!\[Create Private Chat](./screenshots/03-create-private-chat.png)



\---



\### 💬 Private Chat



Private conversations support real-time messaging using WebSocket communication. Messages are delivered instantly to connected participants and stored in MongoDB.



!\[PulseChat Private Chat](./screenshots/04-private-chat.png)



\---



\## 🛠️ Tech Stack



\### Frontend



\- React.js

\- Vite

\- JavaScript

\- CSS

\- React Router



\### Backend



\- Node.js

\- Express.js

\- WebSocket (`ws`)



\### Database



\- MongoDB

\- Mongoose

\- MongoDB Atlas



\### Authentication \& Security



\- JWT

\- bcryptjs

\- HTTP-only Cookies

\- CORS

\- cookie-parser

\- dotenv



\### Development Tools



\- VS Code

\- Git

\- GitHub

\- npm

\- MongoDB Atlas



\---



\## ⚡ Real-Time Communication



PulseChat uses \*\*WebSocket communication\*\* to provide real-time messaging.



The application uses:



\- \*\*REST APIs\*\* for authentication, rooms and chat history

\- \*\*WebSocket\*\* for real-time messaging

\- \*\*MongoDB\*\* for persistent message storage



\### Message Flow



```text

User

&#x20; ↓

React Frontend

&#x20; ↓

WebSocket Connection

&#x20; ↓

Node.js WebSocket Server

&#x20; ↓

MongoDB

&#x20; ↓

WebSocket Broadcast

&#x20; ↓

Other Connected Users

