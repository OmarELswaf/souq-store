import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, Lightformer, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

// Decorative 3D layer for the home hero. Purely additive: it renders behind
// the existing hero copy and never blocks interaction (pointer-events: none).
// Loaded lazily by Home.jsx so three.js stays out of the main bundle.

const GREEN = "#16a34a";
const DEEP = "#0e3d22";
const MINT = "#a7e8bd";

function Shape({ position, geometry, color, speed = 1, distort = 0.4, scale = 1 }) {
  const ref = useRef();
  useFrame((state, delta) => {
    ref.current.rotation.x += delta * 0.15 * speed;
    ref.current.rotation.y += delta * 0.2 * speed;
  });
  return (
    <Float speed={2 * speed} rotationIntensity={0.6} floatIntensity={1.4}>
      <mesh ref={ref} position={position} scale={scale} castShadow>
        {geometry}
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.35} />
      </mesh>
    </Float>
  );
}

function Rig({ children }) {
  // Gentle pointer parallax on the whole scene.
  const ref = useRef();
  useFrame((state, delta) => {
    const { x, y } = state.pointer;
    ref.current.rotation.y += (x * 0.12 - ref.current.rotation.y) * Math.min(1, delta * 3);
    ref.current.rotation.x += (-y * 0.08 - ref.current.rotation.x) * Math.min(1, delta * 3);
  });
  return <group ref={ref}>{children}</group>;
}

export default function Hero3D() {
  return (
    <Canvas
      className="hero-canvas"
      camera={{ position: [0, 0, 8], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <spotLight position={[6, 8, 6]} angle={0.5} intensity={120} color="#ffffff" penumbra={1} />
        <Rig>
          <Shape position={[-5.2, -2.4, -2]} color={GREEN} scale={0.65} geometry={<torusKnotGeometry args={[0.7, 0.24, 160, 24]} />} />
          <Shape position={[4.3, 2.4, -1.5]} color={DEEP} scale={1.0} speed={0.7} geometry={<icosahedronGeometry args={[0.95, 0]} />} />
          <Shape position={[3.1, -2.1, -0.5]} color={MINT} scale={0.62} speed={1.4} geometry={<torusGeometry args={[0.8, 0.3, 24, 80]} />} />
          <Shape position={[0.9, -2.2, -1]} color={GREEN} scale={0.5} speed={1.2} geometry={<octahedronGeometry args={[0.9, 0]} />} />
          <Shape position={[-4.2, 2.3, -3]} color={MINT} scale={0.55} speed={0.9} geometry={<sphereGeometry args={[0.9, 48, 48]} />} />
        </Rig>
        <ContactShadows position={[0, -2.6, 0]} opacity={0.25} scale={16} blur={2.6} far={5} color="#0e3d22" />
        <Environment resolution={64}>
          <Lightformer intensity={1.2} position={[0, 4, 4]} scale={[8, 4, 1]} color="#eafff1" />
          <Lightformer intensity={0.8} position={[-5, 0, 2]} scale={[4, 6, 1]} color="#baf5cf" />
        </Environment>
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.35} luminanceThreshold={0.75} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.55} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
