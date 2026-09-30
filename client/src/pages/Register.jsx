import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
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
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Registration failed");
        return;
      }

      navigate("/login");
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

          <div className="auth-icon register-icon">
            <span>+</span>
          </div>

          <div className="auth-heading">
            <span>CREATE YOUR SPACE</span>
            <h1>Join PulseChat</h1>
            <p>Create your account and start talking in real time.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              <span>Username</span>

              <input
                type="text"
                name="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </label>

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
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </label>

            {message && <div className="auth-message error">{message}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Creating account...
                </>
              ) : (
                <>
                  Create PulseChat account
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span />
            <small>ALREADY HAVE AN ACCOUNT?</small>
            <span />
          </div>

          <Link to="/login" className="auth-secondary">
            Sign in instead
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

export default Register;
