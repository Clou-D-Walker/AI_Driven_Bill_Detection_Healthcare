import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Github, ExternalLink, Mail, Shield } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border/50">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">MedicalAI</h3>
                <Badge variant="secondary" className="text-xs">Document Processing</Badge>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Advanced AI-powered medical document processing service that extracts, normalizes, and classifies financial amounts with high accuracy.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <Github className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* API */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">API</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                OpenAPI Spec
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Postman Collection
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Rate Limits
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Status Page
              </a>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Resources</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Getting Started
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Code Examples
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                SDKs & Libraries
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Best Practices
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </a>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Support</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Contact Us
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Support Center
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Bug Reports
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Feature Requests
              </a>
              <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">
                Community
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>© {currentYear} MedicalAI. All rights reserved.</span>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>GDPR Compliant</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Security
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;