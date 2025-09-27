import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Server, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";

const ServerStatus = () => {
  const [serverStatus, setServerStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");
  const [serverInfo, setServerInfo] = useState<any>(null);

  const checkServerStatus = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/health");
      if (response.ok) {
        const data = await response.json();
        setServerStatus("online");
        setServerInfo(data);
      } else {
        setServerStatus("offline");
      }
    } catch (error) {
      setServerStatus("offline");
    }
  };

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Server className="w-5 h-5" />
          Backend Server Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {serverStatus === "checking" && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Checking server status...</AlertDescription>
          </Alert>
        )}

        {serverStatus === "online" && (
          <Alert className="border-accent/20 bg-accent/10">
            <CheckCircle className="h-4 w-4 text-accent" />
            <AlertDescription className="text-gray-800">
              ✅ Backend server is running and ready for AI processing!
              {serverInfo && (
                <div className="mt-2 space-y-1 text-xs">
                  <div>Version: {serverInfo.version}</div>
                  <div>
                    Uptime: {Math.floor(serverInfo.uptime / 60)}m{" "}
                    {Math.floor(serverInfo.uptime % 60)}s
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {serverStatus === "offline" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ❌ Backend server is not running. To use real AI processing:
              <div className="mt-3 space-y-2 text-sm">
                <div className="font-mono bg-background/50 p-2 rounded">
                  cd server
                  <br />
                  npm install
                  <br />
                  npm start
                </div>
                <div className="text-xs text-muted-foreground">
                  Server will start on http://localhost:3001
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={checkServerStatus}>
            Refresh Status
          </Button>
          {serverStatus === "online" && (
            <Button variant="outline" size="sm" asChild>
              <a
                href="http://localhost:3001/api/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                API Docs
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerStatus;
