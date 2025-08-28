import { Brain, Code } from 'lucide-react';

interface SkillTagProps {
  skill: string;
  index: number;
  isLearning?: boolean;
}

const Skills = () => {
  const currentlyLearning = [
    'SQL', 'Machine Learning'
  ];
  
  const skillsLearned = [
    'Python', 'Git', 'NumPy', 'RESTful APIs', 'HTML', 'CSS', 'TailwindCSS', 'React'
  ];

  const SkillTag = ({ skill, index, isLearning = false }: SkillTagProps) => (
    <div 
      className={`px-4 py-2 rounded-md border transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 cursor-default ${
        isLearning 
          ? 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/15 hover:border-white/40 hover:text-white hover:shadow-white/20' 
          : 'bg-white/10 border-white/30 text-gray-200 hover:bg-white/20 hover:border-white/50 hover:text-white hover:shadow-white/30'
      }`}
      style={{ 
        animationDelay: `${index * 100}ms`,
        animation: 'fadeInUp 0.6s ease-out forwards'
      }}
    >
      <span className="font-mono text-sm">{skill}</span>
    </div>
  );

  return (
    <section className="py-24 px-6 relative z-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          SKILLS
        </h2>
        
        <div className="grid md:grid-cols-2 gap-12">
          {/* Currently Learning */}
          <div className="space-y-6 text-center">
            <h3 className="text-2xl font-semibold text-gray-300 flex items-center justify-center">
              <Brain className="mr-3" size={24} />
              Currently Learning
            </h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {currentlyLearning.map((skill, index) => (
                <SkillTag key={skill} skill={skill} index={index} isLearning={true} />
              ))}
            </div>
          </div>

          {/* Skills Learned */}
          <div className="space-y-6 text-center">
            <h3 className="text-2xl font-semibold text-gray-200 flex items-center justify-center">
              <Code className="mr-3" size={24} />
              Skills Learned
            </h3>
            <div className="flex flex-wrap gap-3 justify-center">
              {skillsLearned.map((skill, index) => (
                <SkillTag key={skill} skill={skill} index={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;
