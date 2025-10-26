// src/components/ProjectCard.js
import React from 'react';

function ProjectCard({ project }) {
  return (
    <div className="project-card">
      <div className="card-details">
        <h2>{project.title}</h2>
        <p>{project.description}</p>
        <button className="view-more-btn">View More</button>
      </div>
      <div className="card-icon">
        🖥️
      </div>
    </div>
  );
}

export default ProjectCard;