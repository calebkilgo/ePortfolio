import { type FC } from 'react';
import CodeWindow from './CodeWindow';

const Hero: FC = () => {
  return (
    <section className="min-h-screen flex items-center justify-center relative z-10 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-white via-gray-300 to-gray-600 bg-clip-text text-transparent animate-fade-in mb-6">
            CALEB KILGO
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 font-light mb-2">
            Computer Science Student
          </p>
          <p className="text-lg text-gray-500 mb-12">
            University of Alabama in Huntsville
          </p>
        </div>

        {/* Code Window - Centered */}
        <div className="flex justify-center">
          <CodeWindow />
        </div>
      </div>
    </section>
  );
};

export default Hero;
