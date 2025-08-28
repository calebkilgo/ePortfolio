import { Github, Linkedin, Mail } from 'lucide-react';

interface ContactLink {
  name: string;
  value: string;
  href: string;
  icon: typeof Github | typeof Linkedin | typeof Mail;
}

const Contact = () => {
  const contactLinks: ContactLink[] = [
    {
      name: 'Email',
      value: 'calebkilgo10@gmail.com',
      href: 'mailto:calebkilgo10@gmail.com',
      icon: Mail
    },
    {
      name: 'LinkedIn',
      value: 'linkedin.com/in/caleb-kilgo/',
      href: 'https://www.linkedin.com/in/caleb-kilgo/',
      icon: Linkedin
    },
    {
      name: 'GitHub',
      value: 'github.com/calebkilgo',
      href: 'https://github.com/calebkilgo',
      icon: Github
    }
  ];

  return (
    <section className="py-24 px-6 relative z-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          CONTACT
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {contactLinks.map((link, index) => (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 hover:scale-105 text-center"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="space-y-4">
                <link.icon 
                  size={32} 
                  className="mx-auto text-white group-hover:text-gray-300 group-hover:scale-110 transition-all duration-300" 
                />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{link.name}</h3>
                  <p className="text-gray-300 text-sm truncate">{link.value}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Contact;
