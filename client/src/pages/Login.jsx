import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      navigate("/chat");
    } catch (error) {
      setMessage("Unable to connect to PulseChat server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
      </div>

      <nav className="auth-nav">
        <Link to="/" className="brand">
          <span className="brand-mark">P</span>
          PulseChat
        </Link>

        <Link to="/" className="auth-home-link">
          Back to home
        </Link>
      </nav>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-glow" />

          <div className="auth-icon">
            <span>↗</span>
          </div>

          <div className="auth-heading">
            <span>WELCOME BACK</span>
            <h1>Sign in to PulseChat</h1>
            <p>Pick up your conversations exactly where you left them.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              <span>Email address</span>

              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              <span>Password</span>

              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </label>

            {message && <div className="auth-message error">{message}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  Continue to PulseChat
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            <small>NEW TO PULSECHAT?</small>
            <span />
          </div>

          <Link to="/register" className="auth-secondary">
            Create an account
          </Link>
        </div>
      </main>

      <footer className="auth-footer">
        <span>PulseChat</span>
        <span>Real-time communication platform</span>
      </footer>
    </div>
  );
};

export default Login;
