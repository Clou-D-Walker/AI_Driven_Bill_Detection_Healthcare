import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ServerStatus from "./ServerStatus";

const LiveDemo = () => {
  const { toast } = useToast();
  const [inputText, setInputText] = useState(
    "Consultation Fee: Rs 500\nMedicine Cost: INR 800\nTotal Bill: INR 1,300\nPaid: INR 1,000\nBalance Due: INR 300"
  );
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: "OCR/Extraction", status: "pending" },
    { title: "Normalization", status: "pending" },
    { title: "Classification", status: "pending" },
    { title: "Final Output", status: "pending" },
  ];

  const sampleTexts = [
    {
      name: "Medical Bill",
      text: "Apollo Hospital\nConsultation Fee: Rs 500\nLab Tests: INR 800\nMedicine: INR 300\nTotal Bill: INR 1,600\nPaid: INR 1,600\nBalance: INR 0",
    },
    {
      name: "Pharmacy Receipt",
      text: "MedPlus Pharmacy\nParacetamol: Rs 45\nAmoxicillin: Rs 250\nVitamin D3: Rs 180\nSubtotal: Rs 475\nTax (5%): Rs 24\nTotal: Rs 499\nPaid: Rs 500\nChange: Rs 1",
    },
    {
      name: "Insurance Claim",
      text: "Health Insurance Settlement\nClaim Amount: INR 15,000\nDeductible: INR 2,000\nCovered Amount: INR 13,000\nPatient Responsibility: INR 2,000\nPaid to Provider: INR 13,000",
    },
  ];

  const simulateProcessing = async () => {
    setProcessing(true);
    setCurrentStep(0);
    setResult(null);

    try {
      // Step 1: OCR/Text Extraction
      setCurrentStep(1);
      const extractResponse = await fetch(
        "http://localhost:3001/api/medical-amounts/step1/extract",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: inputText }),
        }
      );

      if (!extractResponse.ok) {
        throw new Error("Extraction failed");
      }

      const extractData = await extractResponse.json();
      console.log("Step 1 - Extraction:", extractData);

      // Step 2: Normalization
      setCurrentStep(2);
      const normalizeResponse = await fetch(
        "http://localhost:3001/api/medical-amounts/step2/normalize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            raw_tokens: extractData.raw_tokens,
            currency_hint: extractData.currency_hint,
          }),
        }
      );

      if (!normalizeResponse.ok) {
        throw new Error("Normalization failed");
      }

      const normalizeData = await normalizeResponse.json();
      console.log("Step 2 - Normalization:", normalizeData);

      // Step 3: Classification
      setCurrentStep(3);
      const classifyResponse = await fetch(
        "http://localhost:3001/api/medical-amounts/step3/classify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            normalized_amounts: normalizeData.normalized_amounts,
            original_text: inputText,
          }),
        }
      );

      if (!classifyResponse.ok) {
        throw new Error("Classification failed");
      }

      const classifyData = await classifyResponse.json();
      console.log("Step 3 - Classification:", classifyData);

      // Step 4: Final Output
      setCurrentStep(4);
      const finalizeResponse = await fetch(
        "http://localhost:3001/api/medical-amounts/step4/finalize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amounts: classifyData.amounts,
            currency_hint: extractData.currency_hint,
            original_text: inputText,
          }),
        }
      );

      if (!finalizeResponse.ok) {
        throw new Error("Finalization failed");
      }

      const finalData = await finalizeResponse.json();
      console.log("Step 4 - Final Output:", finalData);

      setResult(finalData);
      setProcessing(false);

      toast({
        title: "Processing Complete!",
        description:
          "Successfully extracted and classified financial amounts using real AI",
      });
    } catch (error) {
      console.error("Processing Error:", error);
      setProcessing(false);
      setCurrentStep(0);

      // Fallback to simulation if backend is not available
      toast({
        title: "Backend Unavailable",
        description:
          "Using simulated demo data - start the Node.js server for real AI processing",
        variant: "destructive",
      });

      // Fallback simulation data
      setTimeout(() => {
        setResult({
          currency: "INR",
          amounts: [
            {
              type: "consultation",
              value: 500,
              source: "text: 'Consultation Fee: Rs 500'",
            },
            {
              type: "medicine",
              value: 800,
              source: "text: 'Medicine Cost: INR 800'",
            },
            {
              type: "total_bill",
              value: 1300,
              source: "text: 'Total Bill: INR 1,300'",
            },
            { type: "paid", value: 1000, source: "text: 'Paid: INR 1,000'" },
            { type: "due", value: 300, source: "text: 'Balance Due: INR 300'" },
          ],
          status: "ok",
          processing_time_ms: 1500,
        });
      }, 1000);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append("image", file);

        setProcessing(true);
        setCurrentStep(1);

        const response = await fetch(
          "http://localhost:3001/api/medical-amounts/process",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Image processing failed");
        }

        const result = await response.json();
        setResult(result);
        setCurrentStep(4);
        setProcessing(false);

        toast({
          title: "Image Processing Complete!",
          description: "Successfully processed medical document image with AI",
        });
      } catch (error) {
        console.error("Image processing error:", error);
        setProcessing(false);
        setCurrentStep(0);
        toast({
          title: "Image Processing Failed",
          description:
            "Please ensure the backend server is running for image processing",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Interactive Demo
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Try the AI Processing Pipeline
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience real-time medical document processing. Upload an image or
            paste text to see our AI extract and classify financial amounts.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Server Status */}
          <div className="mb-8">
            <ServerStatus />
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">
                  Input Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="text" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">
                      <FileText className="w-4 h-4 mr-2" />
                      Text Input
                    </TabsTrigger>
                    <TabsTrigger value="image">
                      <Upload className="w-4 h-4 mr-2" />
                      Image Upload
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Sample Documents:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {sampleTexts.map((sample, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => setInputText(sample.text)}
                          >
                            {sample.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      placeholder="Paste medical document text here..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="min-h-32 font-mono text-sm"
                    />
                  </TabsContent>

                  <TabsContent value="image" className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Upload medical bill, receipt, or insurance document
                      </p>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button variant="outline" asChild>
                        <label htmlFor="file-upload" className="cursor-pointer">
                          Choose File
                        </label>
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Supports JPG, PNG, PDF (max 10MB)
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <Button
                  variant="medical"
                  size="lg"
                  className="w-full mt-6"
                  onClick={simulateProcessing}
                  disabled={processing || !inputText.trim()}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Step {currentStep}/4
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 mr-2" />
                      Process Document
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Output Section */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">
                  Processing Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Processing Steps */}
                <div className="space-y-3 mb-6">
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          currentStep > index
                            ? "bg-accent text-accent-foreground"
                            : currentStep === index
                            ? "bg-primary text-primary-foreground animate-pulse"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {currentStep > index ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : currentStep === index ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          currentStep > index
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Results */}
                {result ? (
                  <>
                    {/* Summary - kept outside the scroll area so it's always visible */}
                    <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        Extraction Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Currency:
                          </span>
                          <Badge variant="secondary" className="ml-2">
                            {result.currency}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Amounts Found:
                          </span>
                          <Badge variant="secondary" className="ml-2">
                            {result.amounts?.length ?? 0}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant="secondary" className="ml-2">
                            {result.status}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Processing Time:
                          </span>
                          <Badge variant="secondary" className="ml-2">
                            {result.processing_time_ms ?? 0}ms
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <ScrollArea className="h-80">
                      <div className="space-y-4">
                        {/* Extracted Amounts */}
                        <div>
                          <h4 className="font-semibold text-foreground mb-3">
                            Classified Amounts
                          </h4>
                          <div className="space-y-2">
                            {result.amounts?.map(
                              (amount: any, index: number) => (
                                <div
                                  key={index}
                                  className="bg-muted/30 rounded-lg p-3"
                                >
                                  <div className="flex items-center justify-between mb-2 gap-4">
                                    <Badge variant="outline">
                                      {amount.type
                                        .replace("_", " ")
                                        .toUpperCase()}
                                    </Badge>
                                    <span
                                      className="font-semibold text-lg text-foreground min-w-[90px] text-right whitespace-nowrap"
                                      title={`${
                                        result.currency
                                      } ${amount.value.toLocaleString()}`}
                                    >
                                      {result.currency}{" "}
                                      {amount.value.toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Source: {amount.source}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Raw JSON */}
                        <div>
                          <h4 className="font-semibold text-foreground mb-3">
                            Raw JSON Response
                          </h4>
                          <pre className="bg-muted/50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Process a document to see results here
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveDemo;
