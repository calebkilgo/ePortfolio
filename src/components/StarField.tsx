import { useRef, useEffect, useState } from 'react';

// <click>self.focus</click>

interface Star {
  x: number;
  y: number;
  z: number;
  self: { focus: number };
}

const StarField = () => {
  const [isInteractive, setIsInteractive] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number; speed: number }>({
    x: 0,
    y: 0,
    speed: 0
  });
  const stars = useRef<Star[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset mouse state when interactive mode changes
    if (!isInteractive) {
      mouseRef.current = { x: 0, y: 0, speed: 3 };
    }
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars.current = []; // Clear stars on resize
      createStars(); // Recreate stars with new dimensions
    };

    const createStars = () => {
      const count = 75;
      stars.current = [];
      
      for (let i = 0; i < count; i++) {
        stars.current.push({
          x: Math.random() * canvas.width - canvas.width/2,
          y: Math.random() * canvas.height - canvas.height/2,
          z: Math.random() * 1500,
          self: { focus: Math.random() }
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isInteractive) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      const dx = (x - centerX) / centerX;
      const dy = (y - centerY) / centerY;
      
      const distance = Math.sqrt(dx * dx + dy * dy);
      mouseRef.current.speed = Math.min(distance * 8, 12);
      mouseRef.current.x = dx * 0.9; // Slightly increased from original 0.6
      mouseRef.current.y = dy * 0.9; // Slightly increased from original 0.6
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      stars.current.forEach(star => {
        star.z -= mouseRef.current.speed + 1;

        if (star.z < 1) {
          star.z = 1500;
          star.x = Math.random() * canvas.width - centerX;
          star.y = Math.random() * canvas.height - centerY;
          star.self.focus = Math.random();
          return;
        }

        const directionMultiplier = isInteractive ? 0.15 : 0.1;
        const x = (star.x + mouseRef.current.x * star.z * directionMultiplier) / (star.z * 0.001);
        const y = (star.y + mouseRef.current.y * star.z * directionMultiplier) / (star.z * 0.001);

        if (x < -centerX || x > centerX || y < -centerY || y > centerY) {
          star.z = 1500;
          star.x = Math.random() * canvas.width - centerX;
          star.y = Math.random() * canvas.height - centerY;
          star.self.focus = Math.random();
          return;
        }

        const trailLength = mouseRef.current.speed * 2;
        const trailX = (star.x + mouseRef.current.x * (star.z + trailLength) * directionMultiplier) / ((star.z + trailLength) * 0.001);
        const trailY = (star.y + mouseRef.current.y * (star.z + trailLength) * directionMultiplier) / ((star.z + trailLength) * 0.001);

        const size = Math.min(1500 / star.z, 4) * star.self.focus;
        const brightness = Math.min(1500 / star.z, 1) * star.self.focus;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.lineWidth = size * 2;
        ctx.moveTo(x + centerX, y + centerY);
        ctx.lineTo(trailX + centerX, trailY + centerY);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.arc(x + centerX, y + centerY, size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    createStars();
    animate();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isInteractive]);

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-2">
        <label className="text-white text-sm select-none">Interactive Mode</label>
        <button
          onClick={() => setIsInteractive(prev => !prev)}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          className={`w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer hover:opacity-90 ${
            isInteractive ? 'bg-blue-500' : 'bg-gray-600'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transform transition-transform duration-200 ${
              isInteractive ? 'translate-x-8' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse at center, #0f0f23 0%, #000 100%)' }}
      />
    </>
  );
};

export default StarField;
