import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Eye, 
  Settings, 
  Tags, 
  Shield, 
  Zap, 
  FileText, 
  Globe2, 
  CheckCircle 
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Processing",
      description: "Advanced machine learning algorithms powered by Google Gemini Vision API for intelligent document analysis and understanding.",
      highlights: ["Gemini Vision API", "90%+ Accuracy", "Context Understanding", "Medical Terminology"]
    },
    {
      icon: Eye,
      title: "Advanced OCR",
      description: "Handle low-quality scans, skewed images, and handwritten text with industry-leading optical character recognition.",
      highlights: ["Multi-format Support", "Error Correction", "Handwriting Recognition", "Quality Enhancement"]
    },
    {
      icon: Settings,
      title: "Smart Normalization", 
      description: "Automatically correct OCR errors and standardize amount formats using intelligent pattern recognition.",
      highlights: ["Error Correction", "Format Standardization", "Digit Recognition", "Quality Validation"]
    },
    {
      icon: Tags,
      title: "Context Classification",
      description: "Classify extracted amounts by medical context - total bills, payments, due amounts, and procedure costs.",
      highlights: ["8+ Amount Types", "Context Awareness", "Medical Taxonomy", "Confidence Scoring"]
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "GDPR compliant processing with no persistent storage, automatic cleanup, and enterprise-grade security.",
      highlights: ["GDPR Compliant", "No Data Storage", "Secure Processing", "Audit Trails"]
    },
    {
      icon: Zap,
      title: "High Performance",
      description: "Process documents in under 3 seconds with support for 1000+ concurrent requests and horizontal scaling.",
      highlights: ["< 3s Processing", "1000+ Concurrent", "Auto-scaling", "99% Uptime"]
    },
    {
      icon: FileText,
      title: "Multi-Format Support",
      description: "Process text inputs, image uploads (JPG, PNG), and PDF documents with consistent accuracy across formats.",
      highlights: ["Text & Images", "PDF Support", "10MB File Limit", "Batch Processing"]
    },
    {
      icon: Globe2,
      title: "Multi-Currency",
      description: "Support for multiple currencies with automatic detection and normalization for global healthcare systems.",
      highlights: ["Auto-Detection", "Global Currencies", "Format Conversion", "Regional Compliance"]
    }
  ];

  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Core Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Enterprise-Grade AI Processing
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive medical document processing solution with advanced AI capabilities, 
            built for healthcare organizations that demand accuracy and reliability.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300 group h-full"
            >
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg text-foreground">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
                
                <div className="space-y-2">
                  {feature.highlights.map((highlight, highlightIndex) => (
                    <div 
                      key={highlightIndex} 
                      className="flex items-center gap-2 text-xs"
                    >
                      <CheckCircle className="w-3 h-3 text-accent flex-shrink-0" />
                      <span className="text-muted-foreground">{highlight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Accuracy Rate", value: "90%+", desc: "For medical documents" },
            { label: "Processing Speed", value: "<3s", desc: "Average response time" },
            { label: "Supported Formats", value: "5+", desc: "Text, images, PDFs" },
            { label: "Uptime SLA", value: "99%", desc: "Enterprise reliability" }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="font-semibold text-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;