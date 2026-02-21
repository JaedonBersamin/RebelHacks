import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { createClient } from "@supabase/supabase-js";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import eventData from "./map_ready_events.json";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────
// EVENT CARD COMPONENT
// ─────────────────────────────────────────
const EventCard = ({
  item,
  onViewMap,
}: {
  item: any;
  onViewMap: () => void;
}) => (
  <View style={styles.card}>
    {/* Image */}
    <View style={styles.cardImageContainer}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cardImagePlaceholder} />
      )}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>
          {item.category || item.coolFactor || "Event"}
        </Text>
      </View>
    </View>

    {/* Details */}
    <View style={styles.cardBody}>
      <Text style={styles.cardTitle}>{item.eventName || item.name}</Text>

      <View style={styles.cardMeta}>
        <Text style={styles.metaIcon}>📅</Text>
        <Text style={styles.metaText}>{item.date}</Text>
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.metaIcon}>🕐</Text>
        <Text style={styles.metaText}>{item.time}</Text>
      </View>

      {(item.showOnMap || item.latitude) && (
        <TouchableOpacity style={styles.viewMapButton} onPress={onViewMap}>
          <Text style={styles.viewMapIcon}>📍</Text>
          <Text style={styles.viewMapText}>View on Map</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ─────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────
export default function App() {
  const [locationPermission, setLocationPermission] = useState(null);
  const [hotSpots, setHotSpots] = useState([]);
  const [isReporting, setIsReporting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [focusedEvent, setFocusedEvent] = useState(null);

  const liveEvents = eventData.events || [];
  const activeMapEvents = liveEvents.filter(
    (event) => event.showOnMap === true && event.latitude && event.longitude,
  );

  const UNLV_REGION = {
    latitude: 36.1069,
    longitude: -115.1405,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === "granted");

      const { data } = await supabase.from("hotspots").select("*");
      if (data) setHotSpots(data);
    })();

    const subscription = supabase
      .channel("public:hotspots")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hotspots" },
        (payload) => {
          setHotSpots((currentSpots) => [...currentSpots, payload.new]);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  useEffect(() => {
    const sweepRadar = setInterval(() => {
      const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
      setHotSpots((currentSpots) =>
        currentSpots.filter((spot) => {
          if (!spot.timestamp || !spot.timestamp.includes("T")) return false;
          const pinTime = new Date(spot.timestamp);
          return pinTime > twentyMinsAgo;
        }),
      );
    }, 10000);

    return () => clearInterval(sweepRadar);
  }, []);

  const handleReportSolicitor = async () => {
    if (!locationPermission) {
      Alert.alert(
        "Permission Denied",
        "We need your location to drop a warning pin!",
      );
      return;
    }

    setIsReporting(true);
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newWarningPin = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase.from("hotspots").insert([newWarningPin]);
      if (error) throw error;

      Alert.alert("Radar Updated", "Mark Successful!");
    } catch (error) {
      Alert.alert("Error", "Could not connect to the radar network.");
      console.log(error);
    } finally {
      setIsReporting(false);
    }
  };

  // ─────────────────────────────────────────
  // MAP VIEW
  // ─────────────────────────────────────────
  if (showMap) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={
            focusedEvent
              ? {
                  latitude: focusedEvent.latitude,
                  longitude: focusedEvent.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }
              : UNLV_REGION
          }
          showsUserLocation={locationPermission}
          showsMyLocationButton={true}
        >
          {activeMapEvents.map((event, index) => (
            <Marker
              key={`event-${index}`}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              title={event.eventName}
              description={event.coolFactor}
              pinColor="#6366F1"
            />
          ))}

          {hotSpots.map((spot, index) => {
            let displayTime = "Recently";
            if (spot.timestamp?.includes("T")) {
              displayTime = new Date(spot.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
            }
            return (
              <Marker
                key={`hotspot-${spot.id || index}`}
                coordinate={{
                  latitude: spot.latitude,
                  longitude: spot.longitude,
                }}
                title="⚠️ Active Hot Spot"
                description={`Reported at ${displayTime}`}
              >
                <View
                  style={{
                    width: 60,
                    height: 60,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Svg
                    height="60"
                    width="60"
                    viewBox="0 0 60 60"
                    style={{ position: "absolute" }}
                  >
                    <Defs>
                      <RadialGradient
                        id="grad"
                        cx="50%"
                        cy="50%"
                        rx="50%"
                        ry="50%"
                        fx="50%"
                        fy="50%"
                      >
                        <Stop
                          offset="0%"
                          stopColor="#EF4444"
                          stopOpacity="0.8"
                        />
                        <Stop
                          offset="40%"
                          stopColor="#EF4444"
                          stopOpacity="0.4"
                        />
                        <Stop
                          offset="100%"
                          stopColor="#EF4444"
                          stopOpacity="0"
                        />
                      </RadialGradient>
                    </Defs>
                    <Circle cx="30" cy="30" r="30" fill="url(#grad)" />
                  </Svg>
                  <View style={styles.snapMapInnerCircle} />
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setShowMap(false);
            setFocusedEvent(null);
          }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* Report button */}
        <TouchableOpacity
          style={styles.reportButton}
          onPress={handleReportSolicitor}
          disabled={isReporting}
        >
          {isReporting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.reportButtonText}>⚠️ Mark Hot Spot</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────
  // HOME VIEW
  // ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>EventFinder</Text>
          <Text style={styles.headerSubtitle}>Discover events near you</Text>
        </View>
        <View style={styles.headerIcon}>
          <Text style={{ fontSize: 22 }}>📍</Text>
        </View>
      </View>

      {/* Events List */}
      <FlatList
        data={liveEvents}
        keyExtractor={(item, index) =>
          `${item.eventName || item.name}-${index}`
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <Text style={styles.sectionSubtitle}>
              {liveEvents.length} events happening soon
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <EventCard
            item={item}
            onViewMap={() => {
              setFocusedEvent(item);
              setShowMap(true);
            }}
          />
        )}
      />

      {/* Fixed Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => setShowMap(true)}
        >
          <Text style={styles.viewAllIcon}>🗺️</Text>
          <Text style={styles.viewAllText}>View All Events on Map</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4FF",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  headerIcon: {
    backgroundColor: "#EEF2FF",
    borderRadius: 50,
    padding: 12,
  },

  // Section
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },

  // List
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImageContainer: {
    height: 180,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
  },
  categoryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  cardBody: {
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 14,
    color: "#6B7280",
  },
  viewMapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  viewMapIcon: {
    fontSize: 14,
  },
  viewMapText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 30,
    backgroundColor: "transparent",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  viewAllIcon: {
    fontSize: 18,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Map overlays
  backButton: {
    position: "absolute",
    top: 60,
    left: 16,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  reportButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#1A1A1A",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  reportButtonText: {
    color: "#F97316",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  snapMapInnerCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 5,
  },
});
