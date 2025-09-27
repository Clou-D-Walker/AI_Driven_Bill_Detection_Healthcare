import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import ProcessingSteps from "@/components/ProcessingSteps";
import LiveDemo from "@/components/LiveDemo";
import ApiDocumentation from "@/components/ApiDocumentation";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ProcessingSteps />
        <LiveDemo />
        <ApiDocumentation />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
