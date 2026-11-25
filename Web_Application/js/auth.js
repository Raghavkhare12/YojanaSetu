/**
 * YojanaSetu Citizen Auth Manager
 * Manages Citizen Login, New Registration, 1-Tap Demo Login, Google OAuth simulation, Guest Trial Mode, and 7-Day Active Session.
 */

export class AuthManager {
  static getSession() {
    const saved = localStorage.getItem("yojanasetu_auth_session");
    if (!saved) return null;
    try {
      const session = JSON.parse(saved);
      // Check 7-day session validity for registered users
      if (!session.isTrialMode) {
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - session.timestamp > sevenDays) {
          this.logout();
          return null;
        }
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  static login(email, password) {
    const session = {
      isLoggedIn: true,
      isTrialMode: false,
      email: email,
      fullName: email.includes("ramesh") ? "Ramesh Kumar" : email.split("@")[0],
      timestamp: Date.now(),
      loginMethod: "Password"
    };
    localStorage.setItem("yojanasetu_auth_session", JSON.stringify(session));
    return session;
  }

  static loginGoogle() {
    const session = {
      isLoggedIn: true,
      isTrialMode: false,
      email: "citizen.google@gmail.com",
      fullName: "Ramesh Kumar (Google Verified)",
      timestamp: Date.now(),
      loginMethod: "Google OAuth"
    };
    localStorage.setItem("yojanasetu_auth_session", JSON.stringify(session));
    return session;
  }

  static register(fullName, email, mobile, password) {
    const session = {
      isLoggedIn: true,
      isTrialMode: false,
      fullName: fullName,
      email: email,
      mobile: mobile,
      timestamp: Date.now(),
      loginMethod: "Registration"
    };
    localStorage.setItem("yojanasetu_auth_session", JSON.stringify(session));
    return session;
  }

  static startTrialMode() {
    const session = {
      isLoggedIn: false,
      isTrialMode: true,
      email: "guest@yojanasetu.gov.in",
      fullName: "Guest Citizen (Trial Mode)",
      timestamp: Date.now(),
      loginMethod: "Guest Trial"
    };
    localStorage.setItem("yojanasetu_auth_session", JSON.stringify(session));
    return session;
  }

  static logout() {
    localStorage.removeItem("yojanasetu_auth_session");
  }

  static requireAuth() {
    const session = this.getSession();
    const currentPath = window.location.pathname.toLowerCase();
    const isLoginPage = currentPath.endsWith("login.html") || currentPath === "/" || currentPath.endsWith("/");

    // If not logged in and not in trial mode, force redirect to login.html
    if (!session && !isLoginPage) {
      window.location.href = "login.html";
    }
  }

  static updateUI() {
    const session = this.getSession();
    const userBtn = document.getElementById("userProfileBtn");
    if (!userBtn) return;

    if (session && session.isLoggedIn) {
      userBtn.innerHTML = `👤 ${session.fullName.split(" ")[0]}`;
      userBtn.title = `Logged in as ${session.email} (7-Day Active Session)`;
    } else if (session && session.isTrialMode) {
      userBtn.innerHTML = `🚀 Guest Trial`;
      userBtn.title = `Running in Guest Trial Mode. Click to Login or Register.`;
    } else {
      userBtn.innerHTML = `🔐 Login / Account`;
      userBtn.title = `Click to Login or Register`;
    }
  }
}
