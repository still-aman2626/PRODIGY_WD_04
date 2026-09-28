import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Chat = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          navigate("/login");
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        navigate("/login");
      }
    };

    getCurrentUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      navigate("/login");
    } catch (error) {
      console.error("Logout failed");
    }
  };

  if (!user) {
    return <p>Loading chat...</p>;
  }

  return (
    <div>
      <h1>PulseChat</h1>

      <h2>Welcome, {user.username}!</h2>

      <p>Email: {user.email}</p>

      <p>You are successfully authenticated.</p>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Chat;
