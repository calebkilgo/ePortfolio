import { useState } from 'react';
import { Rocket } from 'lucide-react';

interface Project {
  title: string;
  description: string;
  tech: string[];
  href?: string;
}

interface ProjectCardProps {
  project: Project;
  index: number;
}

const Projects = () => {
  const [showMore, setShowMore] = useState(false);
  
  const featuredProjects = [
    {
      title: "AI Voice Assistant",
      description: "Real-time Python AI voice assistant using ElevenLabs API with conversational, interruptible, and context-aware responses.",
      tech: ["Python", "ElevenLabs API"],
      href: "https://github.com/calebkilgo/Virtual-Assistant"
    },
    {
      title: "Divida.io",
      description: "Full-stack React, Tailwind, Supabase web app with OCR, GPT parsing, and Venmo/PayPal/SMS/WhatsApp payment integration.",
      tech: ["React", "Tailwind CSS", "Supabase"],
      href: "https://divida.io"
    }
  ];

  const ProjectCard = ({ project, index }: ProjectCardProps) => {
    const CardContent = () => (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">{project.title}</h3>
        <p className="text-gray-300 leading-relaxed">{project.description}</p>
        <div className="flex flex-wrap gap-2">
          {project.tech.map(tech => (
            <span key={tech} className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300">
              {tech}
            </span>
          ))}
        </div>
      </div>
    );

    const cardClasses = "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer";
    
    return project.href ? (
      <a 
        href={project.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClasses}
        style={{ animationDelay: `${index * 200}ms` }}
      >
        <CardContent />
      </a>
    ) : (
      <div 
        className={cardClasses}
        style={{ animationDelay: `${index * 200}ms` }}
      >
        <CardContent />
      </div>
    );
  };

  return (
    <section className="py-24 px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          PROJECTS
        </h2>
        
        <div className="grid grid-cols-1 gap-8 mb-12 place-items-center" style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            maxWidth: '1200px',
            margin: '0 auto',
            marginBottom: '4rem'
          }}>
          {featuredProjects.map((project, index) => (
            <ProjectCard key={project.title} project={project} index={index} />
          ))}
        </div>

        <div className="text-center mt-16">
          <button 
            onClick={() => setShowMore(!showMore)}
            className="px-8 py-3 border border-white/30 rounded-full text-white hover:bg-white/10 transition-all duration-300 flex items-center mx-auto space-x-2 hover:scale-105"
          >
            <Rocket size={18} />
            <span>{showMore ? 'Show Less' : 'View More Projects'}</span>
          </button>
        </div>

        {showMore && (
          <div className="mt-12 p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
            <p className="text-center text-gray-300">
              More projects coming soon! Check out my GitHub for additional work and contributions.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Projects;
