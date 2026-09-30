import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000";

const Chat = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socketStatus, setSocketStatus] = useState("connecting");
  const [joinedRoomId, setJoinedRoomId] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const [privateModal, setPrivateModal] = useState(null);
  const [privateName, setPrivateName] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState("");
  const [privateActionLoading, setPrivateActionLoading] = useState(false);
  const [privateActionMessage, setPrivateActionMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const socketRef = useRef(null);
  const previousRoomRef = useRef(null);
  const currentRoomRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    currentRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  const getInitial = (name = "?") => name.charAt(0).toUpperCase();

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  /* =====================================================
     LOAD ROOMS
     ===================================================== */

  const loadRooms = async (selectRoomId = null) => {
    try {
      const response = await fetch(`${API}/api/rooms`, {
        credentials: "include",
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const allRooms = data.rooms || [];

      const general = allRooms.find(
        (room) => room.name?.toLowerCase() === "general",
      );

      const privateRooms = allRooms.filter(
        (room) =>
          room.type === "private" &&
          room.members?.some(
            (member) => member._id === user?._id || member._id === user?.id,
          ),
      );

      const nextRooms = general ? [general, ...privateRooms] : privateRooms;

      setRooms(nextRooms);

      if (selectRoomId) {
        const room = nextRooms.find((item) => item._id === selectRoomId);

        if (room) {
          await handleRoomSelect(room);
        }
      }
    } catch (error) {
      console.error("Room loading failed:", error);
    } finally {
      setLoadingRooms(false);
    }
  };

  /* =====================================================
     CURRENT USER
     ===================================================== */

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch(`${API}/api/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          navigate("/login");
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch {
        navigate("/login");
      }
    };

    getCurrentUser();
  }, [navigate]);

  /* =====================================================
     INITIAL ROOM LOAD
     ===================================================== */

  useEffect(() => {
    if (!user) {
      return;
    }

    loadRooms();
  }, [user]);

  /* =====================================================
     WEBSOCKET
     ===================================================== */

  useEffect(() => {
    if (!user) {
      return;
    }

    const socket = new WebSocket("ws://localhost:5000");

    socketRef.current = socket;
    setSocketStatus("connecting");

    socket.onopen = () => {
      setSocketStatus("connected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "presence_update") {
          setOnlineCount(data.onlineCount || 0);
          return;
        }

        if (data.type === "room_presence_update") {
          if (
            currentRoomRef.current?._id?.toString() === data.roomId?.toString()
          ) {
            setOnlineCount(data.onlineCount || 0);
          }

          return;
        }

        if (data.type === "room_joined") {
          setJoinedRoomId(data.roomId);
          return;
        }

        if (data.type === "room_left") {
          setJoinedRoomId(null);
          return;
        }

        if (data.type === "new_message") {
          const activeRoom = currentRoomRef.current;
          const message = data.message;

          if (
            !activeRoom ||
            message.room?.toString() !== activeRoom._id?.toString()
          ) {
            return;
          }

          setMessages((current) => {
            const alreadyExists = current.some(
              (item) => item._id === message._id,
            );

            if (alreadyExists) {
              return current;
            }

            return [...current, message];
          });

          return;
        }

        if (data.type === "error") {
          console.error("WebSocket:", data.message);
        }
      } catch {
        console.error("Invalid WebSocket payload");
      }
    };

    socket.onerror = () => {
      setSocketStatus("error");
    };

    socket.onclose = () => {
      setSocketStatus("disconnected");
      setJoinedRoomId(null);
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [user]);

  /* =====================================================
     ROOM SELECTION
     ===================================================== */

  const handleRoomSelect = async (room) => {
    if (!room) {
      return;
    }

    if (
      previousRoomRef.current &&
      socketRef.current?.readyState === WebSocket.OPEN
    ) {
      socketRef.current.send(
        JSON.stringify({
          type: "leave_room",
          roomId: previousRoomRef.current._id,
        }),
      );
    }

    previousRoomRef.current = room;

    setSelectedRoom(room);
    setJoinedRoomId(null);
    setMessages([]);
    setMessageInput("");
    setLoadingMessages(true);

    try {
      const joinResponse = await fetch(`${API}/api/rooms/${room._id}/join`, {
        method: "POST",
        credentials: "include",
      });

      if (!joinResponse.ok) {
        const data = await joinResponse.json();

        console.error("Room join failed:", data.message);

        return;
      }

      const response = await fetch(`${API}/api/messages/room/${room._id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setMessages(data.messages || []);

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "join_room",
            roomId: room._id,
          }),
        );
      }
    } catch (error) {
      console.error("Failed to open room:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  /* =====================================================
     AUTOMATICALLY OPEN GENERAL
     ===================================================== */

  useEffect(() => {
    if (!user || !rooms.length || selectedRoom) {
      return;
    }

    const general = rooms.find(
      (room) => room.name?.toLowerCase() === "general",
    );

    handleRoomSelect(general || rooms[0]);
  }, [user, rooms, selectedRoom]);

  /* =====================================================
     SEND MESSAGE
     ===================================================== */

  const handleSendMessage = () => {
    const content = messageInput.trim();

    if (
      !content ||
      !selectedRoom ||
      joinedRoomId !== selectedRoom._id ||
      socketRef.current?.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "room_message",
        roomId: selectedRoom._id,
        content,
      }),
    );

    setMessageInput("");
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSendMessage();
    }
  };

  /* =====================================================
     AUTO SCROLL
     ===================================================== */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /* =====================================================
     PRIVATE CHAT MODALS
     ===================================================== */

  const resetPrivateModal = () => {
    if (privateActionLoading) {
      return;
    }

    setPrivateModal(null);
    setPrivateName("");
    setInviteCodeInput("");
    setCreatedInviteCode("");
    setPrivateActionMessage("");
    setCopiedCode(false);
  };

  const openPrivateModal = (type, room = null) => {
    setPrivateModal(type);
    setPrivateName(room?.name || "");
    setInviteCodeInput("");
    setCreatedInviteCode("");
    setPrivateActionMessage("");
    setCopiedCode(false);

    if (room) {
      setSelectedRoom(room);
    }
  };

  /* =====================================================
     CREATE PRIVATE CHAT
     ===================================================== */

  const handleCreatePrivateChat = async () => {
    setPrivateActionLoading(true);
    setPrivateActionMessage("");

    try {
      const response = await fetch(`${API}/api/rooms/private/create`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setPrivateActionMessage(
          data.message || "Could not create private chat.",
        );

        return;
      }

      let room = data.room;

      if (privateName.trim()) {
        const renameResponse = await fetch(
          `${API}/api/rooms/private/${data.room._id}/name`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              name: privateName.trim(),
            }),
          },
        );

        const renameData = await renameResponse.json();

        if (renameResponse.ok && renameData.room) {
          room = renameData.room;
        }
      }

      setCreatedInviteCode(data.inviteCode);

      setPrivateActionMessage(
        "Chat created. Share this code with another user.",
      );

      await loadRooms(room._id);
    } catch {
      setPrivateActionMessage("Server connection failed. Please try again.");
    } finally {
      setPrivateActionLoading(false);
    }
  };

  /* =====================================================
     JOIN PRIVATE CHAT
     ===================================================== */

  const handleJoinPrivateChat = async () => {
    const code = inviteCodeInput.trim().toUpperCase();

    if (!code) {
      setPrivateActionMessage("Enter an invite code.");

      return;
    }

    setPrivateActionLoading(true);
    setPrivateActionMessage("");

    try {
      const response = await fetch(`${API}/api/rooms/private/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          inviteCode: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPrivateActionMessage(data.message || "Could not join private chat.");

        return;
      }

      await loadRooms(data.room?._id);

      setPrivateActionMessage(data.message || "Joined successfully.");

      setTimeout(() => resetPrivateModal(), 600);
    } catch {
      setPrivateActionMessage("Server connection failed. Please try again.");
    } finally {
      setPrivateActionLoading(false);
    }
  };

  /* =====================================================
     RENAME PRIVATE CHAT
     ===================================================== */

  const handleRenamePrivateChat = async () => {
    const name = privateName.trim();

    if (!selectedRoom || selectedRoom.type !== "private") {
      return;
    }

    if (name.length < 2) {
      setPrivateActionMessage("Chat name must contain at least 2 characters.");

      return;
    }

    setPrivateActionLoading(true);
    setPrivateActionMessage("");

    try {
      const response = await fetch(
        `${API}/api/rooms/private/${selectedRoom._id}/name`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setPrivateActionMessage(data.message || "Could not rename chat.");

        return;
      }

      setRooms((current) =>
        current.map((room) =>
          room._id === selectedRoom._id
            ? {
                ...room,
                ...data.room,
              }
            : room,
        ),
      );

      setSelectedRoom((current) =>
        current
          ? {
              ...current,
              ...data.room,
            }
          : current,
      );

      setPrivateActionMessage("Chat name updated.");

      setTimeout(() => resetPrivateModal(), 500);
    } catch {
      setPrivateActionMessage("Server connection failed. Please try again.");
    } finally {
      setPrivateActionLoading(false);
    }
  };

  /* =====================================================
     COPY INVITE CODE
     ===================================================== */

  const copyInviteCode = async () => {
    if (!createdInviteCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdInviteCode);

      setCopiedCode(true);

      setTimeout(() => setCopiedCode(false), 1600);
    } catch {
      setPrivateActionMessage("Could not copy the code.");
    }
  };

  /* =====================================================
     LOGOUT
     ===================================================== */

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Navigation still occurs if request fails.
    }

    socketRef.current?.close();
    navigate("/login");
  };

  /* =====================================================
     LOADING
     ===================================================== */

  if (!user) {
    return (
      <div className="app-loading">
        <div className="loading-logo">P</div>

        <span>Opening PulseChat...</span>
      </div>
    );
  }

  const isConnected = socketStatus === "connected";

  const privateRooms = rooms.filter((room) => room.type === "private");

  /* =====================================================
     UI
     ===================================================== */

  return (
    <div className="chat-app">
      {/* HEADER */}
      <header className="chat-header">
        <div className="chat-brand-wrap">
          <div className="brand-mark">P</div>

          <div>
            <div className="chat-brand">PulseChat</div>

            <span className="chat-brand-subtitle">
              Conversations that stay in sync
            </span>
          </div>
        </div>

        <div className="chat-header-center">
          <span className="header-context">MESSAGING SPACE</span>

          <span className="header-divider" />

          <span className="header-live-dot" />

          <span>{onlineCount} online now</span>
        </div>

        <div className="chat-header-right">
          <div
            className={`connection-pill ${isConnected ? "online" : "offline"}`}
          >
            <span />

            {socketStatus === "connected" && "Connected"}

            {socketStatus === "connecting" && "Connecting"}

            {socketStatus === "error" && "Connection error"}

            {socketStatus === "disconnected" && "Offline"}
          </div>

          <div className="profile-chip">
            <div className="profile-avatar">{getInitial(user.username)}</div>

            <div className="profile-info">
              <strong>{user.username}</strong>

              <span>{user.email}</span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
            title="Log out"
          >
            <span>↗</span>
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="chat-main">
        {/* SIDEBAR */}
        <aside className="chat-sidebar">
          <div className="sidebar-heading">
            <div>
              <span className="sidebar-eyebrow">WORKSPACE</span>

              <h2>Messages</h2>
            </div>

            <span className="conversation-count">{rooms.length}</span>
          </div>

          <div className="sidebar-search">
            <span>⌕</span>

            <input placeholder="Find a conversation" />

            <kbd>⌘K</kbd>
          </div>

          <div className="room-section-label">CONVERSATIONS</div>

          <div className="room-list">
            {loadingRooms ? (
              <>
                <div className="room-skeleton" />
                <div className="room-skeleton" />
                <div className="room-skeleton" />
              </>
            ) : rooms.length === 0 ? (
              <div className="sidebar-empty">
                <span>—</span>

                <p>No conversations yet.</p>
              </div>
            ) : (
              rooms.map((room) => {
                const active = selectedRoom?._id === room._id;

                const isPrivate = room.type === "private";

                return (
                  <button
                    key={room._id}
                    className={`conversation-item ${active ? "active" : ""}`}
                    onClick={() => handleRoomSelect(room)}
                  >
                    <span
                      className={`room-avatar ${isPrivate ? "private" : ""}`}
                    >
                      {isPrivate ? "◆" : "#"}
                    </span>

                    <span className="room-details">
                      <strong>{room.name}</strong>

                      <span>
                        {room.members?.length || 0}{" "}
                        {room.members?.length === 1 ? "member" : "members"}
                      </span>
                    </span>

                    {isPrivate && (
                      <span
                        className="conversation-edit"
                        title="Rename private chat"
                        onClick={(event) => {
                          event.stopPropagation();

                          openPrivateModal("rename", room);
                        }}
                      >
                        ✎
                      </span>
                    )}

                    {active && <span className="active-indicator" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="sidebar-divider" />

          {/* PRIVATE CHAT TOOLS */}
          <section className="private-panel">
            <div className="private-panel-head">
              <div>
                <span className="sidebar-eyebrow">PRIVATE</span>

                <h3>Private chats</h3>
              </div>

              <span className="private-count">{privateRooms.length}</span>
            </div>

            <button
              className="private-action create"
              onClick={() => openPrivateModal("create")}
            >
              <span className="action-icon">＋</span>

              <span>
                <strong>New private chat</strong>

                <small>Create an invite-only room</small>
              </span>

              <b>→</b>
            </button>

            <button
              className="private-action join"
              onClick={() => openPrivateModal("join")}
            >
              <span className="action-icon">↗</span>

              <span>
                <strong>Join with code</strong>

                <small>Use an invitation code</small>
              </span>

              <b>→</b>
            </button>
          </section>

          <div className="sidebar-footer">
            <div className="realtime-card">
              <span className="realtime-icon">◉</span>

              <div>
                <strong>Live connection</strong>

                <small>Messages arrive instantly through WebSocket.</small>
              </div>
            </div>
          </div>
        </aside>

        {/* CHAT CONTENT */}
        <section className="chat-content">
          {!selectedRoom ? (
            <div className="chat-welcome">
              <div className="welcome-mark">P</div>

              <span className="welcome-label">YOUR MESSAGING SPACE</span>

              <h1>
                Pick a conversation
                <br />
                and start talking.
              </h1>

              <p>
                Private chats, shared rooms and real-time messages — all in one
                place.
              </p>
            </div>
          ) : (
            <>
              {/* CONVERSATION HEADER */}
              <div className="conversation-header">
                <div className="conversation-title">
                  <div
                    className={`conversation-header-icon ${
                      selectedRoom.type === "private" ? "private" : ""
                    }`}
                  >
                    {selectedRoom.type === "private" ? "◆" : "#"}
                  </div>

                  <div>
                    <div className="conversation-name-row">
                      <h2>{selectedRoom.name}</h2>

                      {selectedRoom.type === "private" && (
                        <span className="private-tag">PRIVATE</span>
                      )}
                    </div>

                    <div className="conversation-meta">
                      <span className="status-dot" />
                      {onlineCount} online
                      <span className="meta-separator">•</span>
                      {selectedRoom.members?.length || 0} members
                    </div>
                  </div>
                </div>

                <div
                  className={`room-state ${
                    joinedRoomId === selectedRoom._id ? "ready" : ""
                  }`}
                >
                  <span />

                  {joinedRoomId === selectedRoom._id
                    ? "Live connection"
                    : "Joining room"}
                </div>
              </div>

              {/* MESSAGES */}
              <div className="messages-area">
                {loadingMessages ? (
                  <div className="message-loading">
                    <div className="spinner large" />

                    <span>Loading conversation...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="messages-empty">
                    <div className="empty-message-icon">✦</div>

                    <span>FIRST MESSAGE</span>

                    <h3>Nothing here yet.</h3>

                    <p>
                      Start the conversation and your message will appear here.
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn =
                      message.sender?._id === user._id ||
                      message.sender?._id === user.id;

                    const previous = messages[index - 1];

                    const sameSender =
                      previous?.sender?._id === message.sender?._id;

                    return (
                      <div
                        key={message._id}
                        className={`message-row ${
                          isOwn ? "own-message" : "other-message"
                        } ${sameSender ? "continued" : ""}`}
                      >
                        {!isOwn && !sameSender ? (
                          <div className="message-avatar">
                            {getInitial(message.sender?.username)}
                          </div>
                        ) : !isOwn ? (
                          <div className="message-avatar-spacer" />
                        ) : null}

                        <div className="message-group">
                          {!isOwn && !sameSender && (
                            <span className="message-sender">
                              {message.sender?.username}
                            </span>
                          )}

                          <div className="message-bubble">
                            <span className="message-text">
                              {message.content}
                            </span>

                            <span className="message-time">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* COMPOSER */}
              <div className="composer-area">
                <div className="composer">
                  <span className="composer-prefix">+</span>

                  <input
                    value={messageInput}
                    placeholder={
                      joinedRoomId === selectedRoom._id
                        ? "Write a message..."
                        : "Connecting to room..."
                    }
                    onChange={(event) => setMessageInput(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    disabled={joinedRoomId !== selectedRoom._id}
                  />

                  <button
                    className="send-button"
                    onClick={handleSendMessage}
                    disabled={
                      !messageInput.trim() || joinedRoomId !== selectedRoom._id
                    }
                  >
                    <span>Send</span>

                    <b>↗</b>
                  </button>
                </div>

                <div className="composer-hint">
                  <span>ENTER</span> to send
                  <span className="hint-right">
                    Real-time · Secure connection
                  </span>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* PRIVATE CHAT MODAL */}
      {privateModal && (
        <div className="private-modal-backdrop" onClick={resetPrivateModal}>
          <div
            className="private-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="private-modal-topline" />

            <div className="private-modal-header">
              <div className="private-modal-icon">
                {privateModal === "join"
                  ? "↗"
                  : privateModal === "rename"
                    ? "✎"
                    : "＋"}
              </div>

              <div>
                <span className="modal-eyebrow">
                  {privateModal === "rename"
                    ? "EDIT CONVERSATION"
                    : "PRIVATE CONVERSATION"}
                </span>

                <h3>
                  {privateModal === "create" && "Create a private chat"}

                  {privateModal === "join" && "Join a private chat"}

                  {privateModal === "rename" && "Rename conversation"}
                </h3>
              </div>

              <button
                className="private-modal-close"
                onClick={resetPrivateModal}
                disabled={privateActionLoading}
              >
                ×
              </button>
            </div>

            {/* CREATE */}
            {privateModal === "create" && (
              <>
                <p className="private-modal-description">
                  Give your conversation a name. PulseChat will generate a code
                  you can share with another user.
                </p>

                <label className="private-modal-label">
                  Conversation name
                  <input
                    className="private-modal-input"
                    value={privateName}
                    onChange={(event) => setPrivateName(event.target.value)}
                    placeholder="Project team"
                    maxLength={50}
                    autoFocus
                  />
                </label>

                {!createdInviteCode ? (
                  <div className="private-modal-actions">
                    <button
                      className="private-modal-secondary"
                      onClick={resetPrivateModal}
                    >
                      Cancel
                    </button>

                    <button
                      className="private-modal-primary"
                      onClick={handleCreatePrivateChat}
                      disabled={privateActionLoading}
                    >
                      {privateActionLoading ? "Creating..." : "Create chat"}
                    </button>
                  </div>
                ) : (
                  <div className="private-chat-code-box">
                    <span className="private-chat-code-label">
                      INVITATION CODE
                    </span>

                    <div className="private-chat-code-row">
                      <strong>{createdInviteCode}</strong>

                      <button onClick={copyInviteCode}>
                        {copiedCode ? "Copied" : "Copy code"}
                      </button>
                    </div>

                    <small>
                      Share this code with the person you want to add.
                    </small>
                  </div>
                )}
              </>
            )}

            {/* JOIN */}
            {privateModal === "join" && (
              <>
                <p className="private-modal-description">
                  Enter a code shared by another PulseChat user to join their
                  private conversation.
                </p>

                <label className="private-modal-label">
                  Invitation code
                  <input
                    className="private-modal-input private-code-input"
                    value={inviteCodeInput}
                    onChange={(event) =>
                      setInviteCodeInput(event.target.value.toUpperCase())
                    }
                    placeholder="PULSE-ABC123"
                    maxLength={20}
                    autoFocus
                  />
                </label>

                <div className="private-modal-actions">
                  <button
                    className="private-modal-secondary"
                    onClick={resetPrivateModal}
                  >
                    Cancel
                  </button>

                  <button
                    className="private-modal-primary"
                    onClick={handleJoinPrivateChat}
                    disabled={privateActionLoading}
                  >
                    {privateActionLoading ? "Joining..." : "Join chat"}
                  </button>
                </div>
              </>
            )}

            {/* RENAME */}
            {privateModal === "rename" && (
              <>
                <p className="private-modal-description">
                  Rename this conversation so it is easier to identify in your
                  workspace.
                </p>

                <label className="private-modal-label">
                  Conversation name
                  <input
                    className="private-modal-input"
                    value={privateName}
                    onChange={(event) => setPrivateName(event.target.value)}
                    maxLength={50}
                    autoFocus
                  />
                </label>

                <div className="private-modal-actions">
                  <button
                    className="private-modal-secondary"
                    onClick={resetPrivateModal}
                  >
                    Cancel
                  </button>

                  <button
                    className="private-modal-primary"
                    onClick={handleRenamePrivateChat}
                    disabled={privateActionLoading}
                  >
                    {privateActionLoading ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </>
            )}

            {privateActionMessage && (
              <div className="private-modal-message">
                {privateActionMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
