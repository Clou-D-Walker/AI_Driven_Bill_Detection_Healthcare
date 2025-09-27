# 🚀 Medical AI Document Processing - Setup Guide

This project includes both a **React frontend** (showcasing the service) and a **Node.js backend** (real AI processing) powered by Google Gemini Vision API.

## 📋 Prerequisites

- **Node.js 16+** installed on your system
- **Google Gemini API Key** (already configured: `AIzaSyBAllIHSm7HVa5Wgcn6XQkQYFWidG7g1t0`)

## 🔧 Quick Setup

### 1. Frontend (Already Running)
The React frontend is already running and shows the service interface with features, documentation, and an interactive demo.

### 2. Backend Setup (For Real AI Processing)

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the server
npm start
```

The backend will start on **http://localhost:3001**

## ✨ What You Get

### **Frontend Features:**
- 🎨 **Beautiful Interface** - Professional medical theme with gradients and animations
- 📊 **Interactive Demo** - Try the AI processing pipeline with sample data
- 📚 **Complete API Documentation** - Full REST API reference with code examples
- 🔍 **Step-by-Step Visualization** - See the 4-stage processing pipeline in action

### **Backend Capabilities:**
- 🤖 **Google Gemini AI Integration** - Advanced OCR and document understanding
- 🏥 **Medical Document Expertise** - Specialized for medical bills, prescriptions, insurance claims
- 🔧 **4-Stage Processing Pipeline:**
  1. **OCR/Text Extraction** - Extract raw amounts and text
  2. **Normalization** - Correct OCR errors and standardize formats
  3. **Context Classification** - Classify amounts by medical context
  4. **Final Output** - Structured JSON with provenance tracking

## 🧪 Testing the Integration

### 1. **Check Server Status**
The frontend includes a server status indicator that automatically checks if the backend is running.

### 2. **Try Text Processing**
Use the demo with the default medical bill text:
```
Consultation Fee: Rs 500
Medicine Cost: INR 800
Total Bill: INR 1,300
Paid: INR 1,000
Balance Due: INR 300
```

### 3. **Try Image Upload**
Upload a medical document image (JPG, PNG, PDF up to 10MB) to test OCR processing.

## 🔌 API Endpoints

When the backend is running, you can test these endpoints:

### **Complete Pipeline**
```bash
curl -X POST http://localhost:3001/api/medical-amounts/process \
  -H "Content-Type: application/json" \
  -d '{"text": "Consultation Fee: Rs 500\nTotal: Rs 1000\nPaid: Rs 600\nDue: Rs 400"}'
```

### **Step-by-Step Processing**
```bash
# Step 1: Extract
curl -X POST http://localhost:3001/api/medical-amounts/step1/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "Total: INR 1200"}'

# Step 2: Normalize  
curl -X POST http://localhost:3001/api/medical-amounts/step2/normalize \
  -H "Content-Type: application/json" \
  -d '{"raw_tokens": ["l200"], "currency_hint": "INR"}'

# And so on...
```

### **Health Check**
```bash
curl http://localhost:3001/api/health
```

## 🎯 Expected Output

```json
{
  "currency": "INR",
  "amounts": [
    {
      "type": "consultation",
      "value": 500,
      "source": "text: 'Consultation Fee: Rs 500'"
    },
    {
      "type": "medicine",
      "value": 800,
      "source": "text: 'Medicine Cost: INR 800'"
    },
    {
      "type": "total_bill",
      "value": 1300,
      "source": "text: 'Total Bill: INR 1,300'"
    },
    {
      "type": "paid",
      "value": 1000,
      "source": "text: 'Paid: INR 1,000'"
    },
    {
      "type": "due",
      "value": 300,
      "source": "text: 'Balance Due: INR 300'"
    }
  ],
  "status": "ok",
  "processing_time_ms": 1245
}
```

## 🛠️ Troubleshooting

### **Backend Not Starting?**
- Ensure Node.js 16+ is installed
- Check if port 3001 is available
- Verify all dependencies are installed: `npm install`

### **Frontend Shows "Backend Unavailable"?**
- Start the backend server: `cd server && npm start`
- Check the server status indicator in the demo section
- Verify the server is running on http://localhost:3001

### **API Errors?**
- Check the browser console for detailed error messages
- Verify the Gemini API key is valid
- Test the health endpoint: `curl http://localhost:3001/api/health`

## 🚀 Production Deployment

### **Backend Deployment**
```bash
# Build Docker image
docker build -t medical-ai-backend ./server

# Run container
docker run -p 3001:3001 -e GEMINI_API_KEY=your_key medical-ai-backend
```

### **Frontend Deployment**
The frontend is already configured for deployment and can be published using the Lovable publish feature.

## 📚 Next Steps

1. **Customize Processing** - Modify prompts in `server/index.js` for your specific use case
2. **Add Authentication** - Implement API keys or JWT tokens for production
3. **Scale Infrastructure** - Deploy on cloud platforms with load balancing
4. **Extend Functionality** - Add more document types or processing steps

---

**🎉 You now have a complete AI-powered medical document processing system!**

The frontend showcases the capabilities beautifully, while the backend provides enterprise-grade AI processing with Google Gemini Vision API.