#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_NAME"; // WiFi name
const char* password = "YOUR_WIFI_PASSWORD"; // WiFi password

const char* nodeID = "Sensor1"; // ID 

const int sensorPinA = A0; // Voltage drop pin


float R_shunt = 100.0; // Shunt resistor value (ohms)
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

// Setup
void setup() {
    Serial.begin(115200); // Baud rate
    Serial.println("Hello from ESP32");

    // Setup pins
    analogReadResolution(12);           // 12 Bits (0-4095) 
    analogSetAttenuation(ADC_11db);     // Allows up to ~3.3V range detection

    // WiFi Connection
    WiFi.begin(ssid, password); // Private WiFi
    //WiFi.begin(ssid); // Public WiFi

	unsigned long start = millis(); // Keep track of connection time

    // Wait for WiFi connection
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");

        // Print fail 
        if (millis() - start > 30000) {
            Serial.println("\nFailed to connect!");
            printWiFiStatus();
			start = millis(); // Reset timer
        }
    }

    // WiFi feedback
    Serial.println("\nWiFi connected");
    Serial.println(WiFi.localIP());
}

// Main loop
void loop() {
    // Check WiFi status
    if (WiFi.status() != WL_CONNECTED) return;

    // Read both sides of the shunt
    int rawVoltage = analogRead(sensorPinA);
    delay(2); // Add small delay

    // Convert to voltage
    float sensorVoltage = rawVoltage * (3.3 / 4095.0);
    Serial.printf("Voltage:%f\n", sensorVoltage);

    // Current calculation
    float current = sensorVoltage / R_shunt;

    // Smoothing
    smoothedCurrent = (0.8 * smoothedCurrent) + (0.2 * current);

    // Build JSON string
    String data = "{";
    data += "\"id\":\"" + String(nodeID) + "\",";
    data += "\"current\":" + String(smoothedCurrent, 4); // 4 decimal places
    data += "}";

    Serial.println(data); // Debug packet

    // Send HTTP request
    HTTPClient http;

    http.begin("https://nicepowertracer.vercel.app/api/arduino");
    http.addHeader("Content-Type", "application/json");

    int responseCode = http.POST(data);

    // Debug repsonse
    Serial.print("Response: ");
    Serial.println(responseCode);

    http.end();

    delay(1000); // 1 update/sec 
}
