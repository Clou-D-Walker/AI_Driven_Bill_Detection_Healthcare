import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/medical-ai-hero.jpg";
import { FileText, Brain, Zap, Shield } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-background/10 backdrop-blur-sm border border-primary-foreground/20 rounded-full px-4 py-2 mb-6">
            <Brain className="w-4 h-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">AI-Powered Medical Document Processing</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground mb-6 leading-tight">
            Extract Financial Data from{" "}
            <span className="bg-gradient-to-r from-accent-glow to-primary-glow bg-clip-text text-transparent">
              Medical Documents
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-primary-foreground/80 mb-8 max-w-3xl mx-auto leading-relaxed">
            Advanced OCR and AI-powered classification service that extracts, normalizes, and categorizes financial amounts from medical bills and receipts with 90%+ accuracy.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button variant="hero" size="lg" className="text-lg px-8 py-6">
              <Zap className="w-5 h-5" />
              Try Live Demo
            </Button>
            <Button variant="accent" size="lg" className="text-lg px-8 py-6">
              <FileText className="w-5 h-5" />
              View API Docs
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {[
              { icon: Brain, title: "AI-Powered", desc: "Gemini Vision API" },
              { icon: Zap, title: "Fast Processing", desc: "< 3 seconds" },
              { icon: Shield, title: "Secure", desc: "GDPR Compliant" },
              { icon: FileText, title: "Multi-Format", desc: "Text & Images" },
            ].map((feature, index) => (
              <Card key={index} className="bg-background/10 backdrop-blur-sm border-primary-foreground/20 p-4 hover:bg-background/20 transition-all duration-300">
                <feature.icon className="w-8 h-8 text-accent-glow mx-auto mb-2" />
                <h3 className="font-semibold text-primary-foreground text-sm">{feature.title}</h3>
                <p className="text-xs text-primary-foreground/60">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-accent/20 rounded-full animate-float" />
      <div className="absolute bottom-32 right-16 w-16 h-16 bg-primary-glow/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-40 right-20 w-12 h-12 bg-accent-glow/30 rounded-full animate-float" style={{ animationDelay: '4s' }} />
    </section>
  );
};

export default HeroSection;