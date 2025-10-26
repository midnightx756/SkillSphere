// src/components/Navbar.js
import React from 'react';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">SkillSphere</div>
      <div className="nav-links">
        <a href="#profile">Profile</a>
        <a href="#tabs">My Tabs</a>
        <a href="#upload">Upload</a>
        <a href="#logout">Logout</a>
      </div>
    </nav>
  );
}

export default Navbar;