#include <WiFi.h>
#include <WebSocketsClient.h>

const char* ssid = "1819_Guest"; // WiFi name
const char* password = ""; // WiFi password

WebSocketsClient webSocket;

const char* nodeID = "Sensor1"; // ID 
const int sensorPin = A0; // Voltage detector pin
float R = 1.0; // Resistor value
float smoothedCurrent = 0; // Smoothed current

// WiFi debug helper
void printWiFiStatus() {
    switch (WiFi.status()) {
    case WL_IDLE_STATUS:
        Serial.println("Idle");
        break;
    case WL_NO_SSID_AVAIL:
        Serial.println("SSID not found");
        break;
    case WL_SCAN_COMPLETED:
        Serial.println("Scan completed");
        break;
    case WL_CONNECTED:
        Serial.println("Connected");
        break;
    case WL_CONNECT_FAILED:
        Serial.println("Connection failed");
        break;
    case WL_CONNECTION_LOST:
        Serial.println("Connection lost");
        break;
    case WL_DISCONNECTED:
        Serial.println("Disconnected");
        break;
    }
}

// Websocket handler
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        // Connected event 
    case WStype_CONNECTED:
        Serial.println("Connected to server");
        break;

        // Disconnection event
    case WStype_DISCONNECTED:
        Serial.println("Disconnected from server");
        break;

    case WStype_TEXT:
        Serial.printf("Received: %s\n", payload);
        break;
    }
}

// Setup
void setup() {
    Serial.begin(115200); // Baud rate
    Serial.println("Hello from ESP32");

    // WiFi Connection
    //WiFi.begin(ssid, password); // Private WiFi
    WiFi.begin(ssid); // Public WiFi

    unsigned long start = millis();

    // Wait for WiFi connection
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");

        // Print fail 
        if (millis() - start > 300000 && WiFi.status() == WL_CONNECTED) {
            Serial.println("\nFailed to connect!");
            printWiFiStatus();
        }
    }

    // WiFi feedback
    Serial.println("\nWiFi connected");
    Serial.println(WiFi.localIP());

    // Websocket Reconnect
    webSocket.setReconnectInterval(5000);

    // WebSocket connection
    webSocket.begin("nicepowertracer.vercel.app", 3500, "/");
    webSocket.onEvent(webSocketEvent); // Handle websocket events
}

// Main loop
void loop() {
    webSocket.loop();

    // Check WiFi status
    if (WiFi.status() != WL_CONNECTED) return;

    // Only send if WebSocket is connected
    if (!webSocket.isConnected()) return;

    int raw = analogRead(sensorPin); // Input ADC value
    float voltage = raw * (3.3 / 4095.0); // Convert to voltage
    float current = voltage / R; // Current

    // Smoothing current to prevent jumps
    smoothedCurrent = (0.8 * smoothedCurrent) + (0.2 * current);

    // Build JSON string
    String data = "{";
    data += "\"id\":\"" + String(nodeID) + "\",";
    data += "\"current\":" + String(smoothedCurrent, 3);
    data += "}";

    Serial.println(data); // Debug output

    webSocket.sendTXT(data);

    delay(200); // 5 updates/sec 
}
