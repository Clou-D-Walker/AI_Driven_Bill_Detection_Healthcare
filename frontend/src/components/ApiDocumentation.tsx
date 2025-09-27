import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, ExternalLink, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ApiDocumentation = () => {
  const { toast } = useToast();
  const [activeEndpoint, setActiveEndpoint] = useState("extract");

  const endpoints = [
    {
      id: "extract",
      method: "POST",
      path: "/api/medical-amounts/step1/extract",
      title: "Step 1: OCR/Text Extraction",
      description: "Extract raw text and amounts from medical documents",
      requestBody: {
        multipart: `curl -X POST http://localhost:3000/api/medical-amounts/step1/extract \\
  -F "image=@medical_bill.jpg"`,
        json: `curl -X POST http://localhost:3000/api/medical-amounts/step1/extract \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Total: INR 1200 | Paid: 1000 | Due: 200"}'`
      },
      response: `{
  "raw_tokens": ["1200","1000","200"],
  "currency_hint": "INR", 
  "confidence": 0.85,
  "processing_time_ms": 1245
}`
    },
    {
      id: "normalize", 
      method: "POST",
      path: "/api/medical-amounts/step2/normalize",
      title: "Step 2: Normalization",
      description: "Normalize OCR errors and standardize amount formats",
      requestBody: {
        json: `curl -X POST http://localhost:3000/api/medical-amounts/step2/normalize \\
  -H "Content-Type: application/json" \\
  -d '{
    "raw_tokens": ["l200","1000","2O0"],
    "currency_hint": "INR"
  }'`
      },
      response: `{
  "normalized_amounts": [1200,1000,200],
  "normalization_confidence": 0.82,
  "corrections_applied": ["l200->1200", "2O0->200"]
}`
    },
    {
      id: "classify",
      method: "POST", 
      path: "/api/medical-amounts/step3/classify",
      title: "Step 3: Context Classification",
      description: "Classify amounts by medical context and purpose",
      requestBody: {
        json: `curl -X POST http://localhost:3000/api/medical-amounts/step3/classify \\
  -H "Content-Type: application/json" \\
  -d '{
    "normalized_amounts": [1200,1000,200],
    "original_text": "Total: INR 1200 | Paid: 1000 | Due: 200"
  }'`
      },
      response: `{
  "amounts": [
    {"type":"total_bill","value":1200},
    {"type":"paid","value":1000},
    {"type":"due","value":200}
  ],
  "confidence": 0.80
}`
    },
    {
      id: "finalize",
      method: "POST",
      path: "/api/medical-amounts/step4/finalize", 
      title: "Step 4: Final Output",
      description: "Generate final structured output with provenance",
      requestBody: {
        json: `curl -X POST http://localhost:3000/api/medical-amounts/step4/finalize \\
  -H "Content-Type: application/json" \\
  -d '{
    "amounts": [{"type":"total_bill","value":1200}],
    "currency_hint": "INR",
    "original_text": "Total: INR 1200"
  }'`
      },
      response: `{
  "currency": "INR",
  "amounts": [
    {
      "type": "total_bill",
      "value": 1200,
      "source": "text: 'Total: INR 1200'"
    }
  ],
  "status": "ok", 
  "processing_time_ms": 1245
}`
    },
    {
      id: "complete",
      method: "POST",
      path: "/api/medical-amounts/process",
      title: "Complete Pipeline",
      description: "Process document through all four stages in one call", 
      requestBody: {
        multipart: `curl -X POST http://localhost:3000/api/medical-amounts/process \\
  -F "image=@medical_bill.jpg"`,
        json: `curl -X POST http://localhost:3000/api/medical-amounts/process \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Total: INR 1200 | Paid: 1000 | Due: 200"}'`
      },
      response: `{
  "currency": "INR",
  "amounts": [
    {"type":"total_bill","value":1200,"source":"text: 'Total: INR 1200'"},
    {"type":"paid","value":1000,"source":"text: 'Paid: 1000'"},
    {"type":"due","value":200,"source":"text: 'Due: 200'"}
  ],
  "status": "ok",
  "processing_time_ms": 2145
}`
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code snippet copied to clipboard",
    });
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            API Reference
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Complete API Documentation
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive REST API with step-by-step processing endpoints and complete pipeline integration.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Tabs value={activeEndpoint} onValueChange={setActiveEndpoint} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-8">
              {endpoints.map((endpoint) => (
                <TabsTrigger key={endpoint.id} value={endpoint.id} className="text-xs">
                  {endpoint.id === "complete" ? "Pipeline" : `Step ${endpoint.id.charAt(0).toUpperCase()}`}
                </TabsTrigger>
              ))}
            </TabsList>

            {endpoints.map((endpoint) => (
              <TabsContent key={endpoint.id} value={endpoint.id}>
                <Card className="bg-background border-border/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl text-foreground">{endpoint.title}</CardTitle>
                        <p className="text-muted-foreground mt-2">{endpoint.description}</p>
                        <div className="flex items-center gap-2 mt-4">
                          <Badge variant="secondary">{endpoint.method}</Badge>
                          <code className="bg-muted/50 px-2 py-1 rounded text-sm font-mono">
                            {endpoint.path}
                          </code>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        Try It
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Request */}
                      <div>
                        <h4 className="text-lg font-semibold text-foreground mb-4">Request</h4>
                        <Tabs defaultValue="curl" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="curl">cURL</TabsTrigger>
                            <TabsTrigger value="json">JSON</TabsTrigger>
                          </TabsList>
                          <TabsContent value="curl">
                            <div className="relative">
                              <ScrollArea className="h-48">
                                <pre className="bg-muted/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                                  <code>{endpoint.requestBody.multipart || endpoint.requestBody.json}</code>
                                </pre>
                              </ScrollArea>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(endpoint.requestBody.multipart || endpoint.requestBody.json)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </TabsContent>
                          {endpoint.requestBody.json && (
                            <TabsContent value="json">
                              <div className="relative">
                                <ScrollArea className="h-48">
                                  <pre className="bg-muted/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                                    <code>{endpoint.requestBody.json}</code>
                                  </pre>
                                </ScrollArea>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute top-2 right-2"
                                  onClick={() => copyToClipboard(endpoint.requestBody.json)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </TabsContent>
                          )}
                        </Tabs>
                      </div>

                      {/* Response */}
                      <div>
                        <h4 className="text-lg font-semibold text-foreground mb-4">Response</h4>
                        <div className="relative">
                          <ScrollArea className="h-48">
                            <pre className="bg-muted/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                              <code>{endpoint.response}</code>
                            </pre>
                          </ScrollArea>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(endpoint.response)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Additional Resources */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg">Interactive Swagger Docs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Full OpenAPI specification with interactive testing interface.
                </p>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Swagger UI
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg">Postman Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Ready-to-import collection with all API endpoints and examples.
                </p>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Download Collection
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50 hover:shadow-medical transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg">SDK & Examples</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Code examples and SDKs for popular programming languages.
                </p>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on GitHub
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApiDocumentation;