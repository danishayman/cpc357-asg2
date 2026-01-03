#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// WiFi credentials
const char *ssid = "YOUR_WIFI_SSID"; // Your WiFi SSID
const char *password = "YOUR_WIFI_PASSWORD"; // Your WiFi Password

// MQTT Broker settings
const char *mqtt_server = "YOUR_GCP_VM_IP"; // Your GCP VM external IP
const int mqtt_port = 1883;
const char *mqtt_user = "YOUR_MQTT_USERNAME";     // Optional
const char *mqtt_password = "YOUR_MQTT_PASSWORD"; // Optional
const char *mqtt_topic = "smartroom/sensors";

// Pin definitions
#define DHTPIN 4 // DHT11 data pin
#define DHTTYPE DHT11
#define PIR_PIN 5    // PIR sensor pin
#define LED_PIN 2    // Built-in LED or external LED
#define RELAY_PIN 15 // Relay control pin

// Sensor objects
DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

// Variables
unsigned long lastMsg = 0;
const long interval = 5000; // Send data every 5 seconds
int motionState = 0;
float temperature = 0;
float humidity = 0;

void setup_wifi()
{
    delay(10);
    Serial.println();
    Serial.print("Connecting to ");
    Serial.println(ssid);

    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println("");
    Serial.println("WiFi connected");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());
}

void reconnect()
{
    while (!client.connected())
    {
        Serial.print("Attempting MQTT connection...");

        String clientId = "ESP32Client-";
        clientId += String(random(0xffff), HEX);

        // Attempt to connect
        if (client.connect(clientId.c_str(), mqtt_user, mqtt_password))
        {
            Serial.println("connected");
            // Subscribe to control topic (optional for receiving commands)
            client.subscribe("smartroom/control");
        }
        else
        {
            Serial.print("failed, rc=");
            Serial.print(client.state());
            Serial.println(" try again in 5 seconds");
            delay(5000);
        }
    }
}

void callback(char *topic, byte *payload, unsigned int length)
{
    Serial.print("Message arrived [");
    Serial.print(topic);
    Serial.print("] ");

    String message;
    for (int i = 0; i < length; i++)
    {
        message += (char)payload[i];
    }
    Serial.println(message);

    // Parse JSON command (optional)
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, message);

    if (!error)
    {
        if (doc.containsKey("led"))
        {
            bool ledState = doc["led"];
            digitalWrite(LED_PIN, ledState ? HIGH : LOW);
        }
        if (doc.containsKey("relay"))
        {
            bool relayState = doc["relay"];
            digitalWrite(RELAY_PIN, relayState ? HIGH : LOW);
        }
    }
}

void setup()
{
    Serial.begin(115200);

    // Initialize pins
    pinMode(PIR_PIN, INPUT);
    pinMode(LED_PIN, OUTPUT);
    pinMode(RELAY_PIN, OUTPUT);

    // Initial states
    digitalWrite(LED_PIN, LOW);
    digitalWrite(RELAY_PIN, LOW);

    // Initialize DHT sensor
    dht.begin();

    // Setup WiFi and MQTT
    setup_wifi();
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);

    Serial.println("Smart Room Monitoring System Started");
}

void loop()
{
    if (!client.connected())
    {
        reconnect();
    }
    client.loop();

    unsigned long now = millis();
    if (now - lastMsg > interval)
    {
        lastMsg = now;

        // Read sensors
        temperature = dht.readTemperature();
        humidity = dht.readHumidity();
        motionState = digitalRead(PIR_PIN);

        // Check if readings are valid
        if (isnan(temperature) || isnan(humidity))
        {
            Serial.println("Failed to read from DHT sensor!");
            temperature = 0;
            humidity = 0;
        }

        // Automatic control logic
        // Turn on LED if motion detected
        if (motionState == HIGH)
        {
            digitalWrite(LED_PIN, HIGH);
        }
        else
        {
            digitalWrite(LED_PIN, LOW);
        }

        // Turn on relay if temperature > 30°C (example: fan control)
        if (temperature > 30.0)
        {
            digitalWrite(RELAY_PIN, HIGH);
        }
        else
        {
            digitalWrite(RELAY_PIN, LOW);
        }

        // Create JSON payload
        StaticJsonDocument<256> doc;
        doc["device_id"] = "ESP32-S3-001";
        doc["timestamp"] = now;
        doc["temperature"] = temperature;
        doc["humidity"] = humidity;
        doc["motion"] = motionState;
        doc["led_state"] = digitalRead(LED_PIN);
        doc["relay_state"] = digitalRead(RELAY_PIN);

        char jsonBuffer[256];
        serializeJson(doc, jsonBuffer);

        // Publish to MQTT
        if (client.publish(mqtt_topic, jsonBuffer))
        {
            Serial.println("Data published:");
            Serial.println(jsonBuffer);
        }
        else
        {
            Serial.println("Failed to publish data");
        }

        // Print to Serial Monitor
        Serial.print("Temperature: ");
        Serial.print(temperature);
        Serial.print("°C | Humidity: ");
        Serial.print(humidity);
        Serial.print("% | Motion: ");
        Serial.println(motionState ? "Detected" : "None");
    }
}