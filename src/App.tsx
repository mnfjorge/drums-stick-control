import React from 'react';
import {
  Link, Outlet,
} from "react-router-dom";
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Link className="App-link" to="/">Home</Link>
      </header>
      <Outlet />
    </div>
  );
}

export default App;
