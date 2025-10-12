// src/App.js
import React from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Portfolio from './components/Portfolio';

function App() {
  return (
    <div className="App">
      <Navbar />
      <main>
        <Portfolio />
      </main>
    </div>
  );
}

export default App;