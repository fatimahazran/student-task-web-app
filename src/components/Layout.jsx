import { Link } from "react-router";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Logo } from "./Ant";

// Shared top bar + page container for signed-in pages.
export default function Layout({ user, children }) {
  const name = user.email.split("@")[0];
  return (
    <div className="dash">
      <header className="dash-top">
        <Link to="/" className="logo-link" aria-label="AntWork home"><Logo /></Link>
        <div className="user">
          <span className="avatar" aria-hidden="true">{name[0]?.toUpperCase()}</span>
          <span className="user-email" title={user.email}>{user.email}</span>
          <button className="btn ghost small" onClick={() => signOut(auth)}>Logout</button>
        </div>
      </header>
      <main className="dash-main">{children}</main>
    </div>
  );
}
