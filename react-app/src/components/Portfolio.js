// src/components/Portfolio.js
import React, { useState } from 'react';
import ProjectCard from './ProjectCard';

const projectData = [
  {
    id: 1,
    title: 'Web App for Online Banking',
    description: 'Built a secure online banking application.',
  },
];

function Portfolio() {
  const [activeTab, setActiveTab] = useState('Projects');
  const userName = 'Vivek';

  return (
    <div className="portfolio-container">
      <h1>Hello, {userName} 👋, here's your portfolio.</h1>
      <div className="portfolio-tabs">
        <button className={activeTab === 'Projects' ? 'active' : ''} onClick={() => setActiveTab('Projects')}>
          Projects
        </button>
        <button className={activeTab === 'Certifications' ? 'active' : ''} onClick={() => setActiveTab('Certifications')}>
          Certifications
        </button>
        <button className={activeTab === 'Research' ? 'active' : ''} onClick={() => setActiveTab('Research')}>
          Research Papers
        </button>
        <button className={activeTab === 'Awards' ? 'active' : ''} onClick={() => setActiveTab('Awards')}>
          Awards
        </button>
      </div>
      <div className="portfolio-content">
        {activeTab === 'Projects' && (
          <div>
            {projectData.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
        {activeTab === 'Certifications' && <p>Certifications will be shown here.</p>}
        {activeTab === 'Research' && <p>Research Papers will be shown here.</p>}
        {activeTab === 'Awards' && <p>Awards will be shown here.</p>}
      </div>
    </div>
  );
}

export default Portfolio;