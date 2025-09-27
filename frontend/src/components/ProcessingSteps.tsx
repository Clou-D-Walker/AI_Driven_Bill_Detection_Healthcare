import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import aiIcon from "@/assets/ai-processing-icon.png";
import ocrIcon from "@/assets/ocr-extraction-icon.png";
import classificationIcon from "@/assets/classification-icon.png";
import { ArrowRight, Eye, Settings, Tags, CheckCircle } from "lucide-react";

const ProcessingSteps = () => {
  const steps = [
    {
      id: "01",
      title: "OCR/Text Extraction",
      description: "Extract raw text and amounts from medical documents using Gemini Vision API",
      icon: ocrIcon,
      lucideIcon: Eye,
      endpoint: "/api/medical-amounts/step1/extract",
      features: ["Image OCR processing", "Text input handling", "Currency detection", "Confidence scoring"],
      example: {
        input: "Medical bill image or text",
        output: '{"raw_tokens": ["1200","1000","200"], "currency_hint": "INR", "confidence": 0.85}'
      }
    },
    {
      id: "02", 
      title: "Normalization",
      description: "Correct OCR errors and normalize extracted amounts using AI-powered error correction",
      icon: classificationIcon,
      lucideIcon: Settings,
      endpoint: "/api/medical-amounts/step2/normalize", 
      features: ["OCR error correction", "Digit normalization", "Format standardization", "Quality validation"],
      example: {
        input: '{"raw_tokens": ["l200","1000","2O0"]}',
        output: '{"normalized_amounts": [1200,1000,200], "normalization_confidence": 0.82}'
      }
    },
    {
      id: "03",
      title: "Context Classification", 
      description: "Classify amounts by medical context using intelligent pattern recognition",
      icon: aiIcon,
      lucideIcon: Tags,
      endpoint: "/api/medical-amounts/step3/classify",
      features: ["Context-aware classification", "Medical terminology recognition", "Multi-type detection", "Confidence tracking"],
      example: {
        input: '{"normalized_amounts": [1200,1000,200]}',
        output: '{"amounts": [{"type":"total_bill","value":1200}, {"type":"paid","value":1000}]}'
      }
    },
    {
      id: "04",
      title: "Final Output",
      description: "Generate structured JSON with provenance tracking and comprehensive metadata",
      icon: aiIcon,
      lucideIcon: CheckCircle,
      endpoint: "/api/medical-amounts/step4/finalize",
      features: ["Provenance tracking", "Source attribution", "Structured output", "Processing metrics"],
      example: {
        input: '{"amounts": [...], "currency_hint": "INR"}',
        output: '{"currency": "INR", "amounts": [...], "status": "ok", "processing_time_ms": 1245}'
      }
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Processing Pipeline
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Four-Stage AI Processing
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our intelligent pipeline processes medical documents through four specialized stages, 
            each optimized for accuracy and reliability in financial data extraction.
          </p>
        </div>

        <div className="relative">
          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {steps.map((step, index) => (
              <Card key={step.id} className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <img src={step.icon} alt={step.title} className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs font-mono">
                          STEP {step.id}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {step.endpoint}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl text-foreground">{step.title}</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Features */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {step.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-accent" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Example */}
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-medium text-foreground">Example:</div>
                    <div className="text-xs">
                      <div className="text-muted-foreground mb-1">Input:</div>
                      <code className="bg-background/50 px-2 py-1 rounded text-foreground font-mono text-xs">
                        {step.example.input}
                      </code>
                    </div>
                    <div className="text-xs">
                      <div className="text-muted-foreground mb-1">Output:</div>
                      <code className="bg-background/50 px-2 py-1 rounded text-foreground font-mono text-xs break-all">
                        {step.example.output}
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Connection Lines (Desktop) */}
          <div className="hidden md:block absolute inset-0 pointer-events-none">
            <ArrowRight className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary" />
            <ArrowRight className="absolute top-3/4 right-1/2 transform translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary rotate-180" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessingSteps;