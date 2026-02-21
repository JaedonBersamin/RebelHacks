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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { createClient } from "@supabase/supabase-js";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import eventData from "./map_ready_events.json";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);

const { width, height } = Dimensions.get("window");

// ─────────────────────────────────────────
// EVENT DETAIL FULL SCREEN
// ─────────────────────────────────────────
const EventDetail = ({
  item,
  onClose,
  onViewMap,
}: {
  item: any;
  onClose: () => void;
  onViewMap: () => void;
}) => {
  const date = item.time?.split(" at ")[0] || "";
  const time = item.time?.split(" at ")[1] || item.time || "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero Image */}
        <View style={detail.imageContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={detail.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={detail.heroPlaceholder}>
              <Text style={{ fontSize: 64 }}>🎉</Text>
            </View>
          )}
          <View style={detail.imageOverlay} />
          <TouchableOpacity style={detail.backBtn} onPress={onClose}>
            <Text style={detail.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={detail.heroBadge}>
            <Text style={detail.heroBadgeText}>
              {item.category || item.coolFactor || "Event"}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={detail.content}>
          <Text style={detail.title}>{item.eventName || item.name}</Text>

          {/* Date + Time pills */}
          <View style={detail.pillRow}>
            <View style={detail.pill}>
              <Text style={detail.pillIcon}>📅</Text>
              <Text style={detail.pillText}>{date}</Text>
            </View>
            <View style={detail.pill}>
              <Text style={detail.pillIcon}>🕐</Text>
              <Text style={detail.pillText}>{time}</Text>
            </View>
          </View>

          {/* Location */}
          {item.locationName && (
            <View style={detail.locationRow}>
              <Text style={detail.pillIcon}>📍</Text>
              <Text style={detail.locationText}>{item.locationName}</Text>
            </View>
          )}

          <View style={detail.divider} />

          {/* Highlight */}
          {item.coolFactor && (
            <View style={detail.highlight}>
              <Text style={detail.highlightIcon}>⭐</Text>
              <Text style={detail.highlightText}>{item.coolFactor}</Text>
            </View>
          )}

          {/* Description */}
          {item.description && (
            <View style={detail.section}>
              <Text style={detail.sectionTitle}>About this event</Text>
              <Text style={detail.description}>{item.description}</Text>
            </View>
          )}

          {/* Map button */}
          {(item.showOnMap || item.latitude) && (
            <TouchableOpacity style={detail.mapButton} onPress={onViewMap}>
              <Text style={detail.mapButtonText}>View on Map</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────
// EVENT CARD COMPONENT
// ─────────────────────────────────────────
const EventCard = ({
  item,
  onPress,
  onViewMap,
}: {
  item: any;
  onPress: () => void;
  onViewMap: () => void;
}) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
    <View style={styles.cardInner}>
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

        <View style={styles.cardMetaRow}>
          <View style={styles.cardMeta}>
            <Text style={styles.metaIcon}>📅</Text>
            <Text style={styles.metaText}>
              {item.time?.split(" at ")[0] || ""}
            </Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.metaIcon}>🕐</Text>
            <Text style={styles.metaText}>
              {item.time?.split(" at ")[1] || item.time}
            </Text>
          </View>
        </View>

        {item.locationName && (
          <View style={styles.cardMeta}>
            <Text style={styles.metaIcon}>📍</Text>
            <Text style={styles.metaText}>{item.locationName}</Text>
          </View>
        )}

        {(item.showOnMap || item.latitude) && (
          <TouchableOpacity
            style={styles.viewMapButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onViewMap();
            }}
          >
            <Text style={styles.viewMapText}>View on Map</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────
// HOTSPOT NAME MODAL
// ─────────────────────────────────────────
const HotspotModal = ({
  visible,
  label,
  editing,
  isLoading,
  onChangeLabel,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  name: string;
  editing: boolean;
  isLoading: boolean;
  onChangeLabel: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={hotspotModal.overlay}
    >
      <View style={hotspotModal.card}>
        <Text style={hotspotModal.title}>
          {editing ? "Edit Marker Name" : "Name Your Hotspot"}
        </Text>
        <Text style={hotspotModal.subtitle}>
          {editing
            ? "Update the name others will see on this marker."
            : "Give this marker a name so others know what to look out for."}
        </Text>
        <TextInput
          style={hotspotModal.input}
          placeholder="e.g. Solicitors near SU, Crowd at Rec..."
          placeholderTextColor="#9CA3AF"
          value={label}
          onChangeText={onChangeLabel}
          maxLength={40}
          autoFocus
        />
        <View style={hotspotModal.btnRow}>
          <TouchableOpacity style={hotspotModal.cancelBtn} onPress={onCancel}>
            <Text style={hotspotModal.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={hotspotModal.submitBtn}
            onPress={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={hotspotModal.submitText}>
                {editing ? "Save" : "Drop Pin"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
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
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [myHotspotId, setMyHotspotId] = useState(null);
  const [showHotspotModal, setShowHotspotModal] = useState(false);
  const [hotspotLabel, setHotspotLabel] = useState("");
  const [editingHotspot, setEditingHotspot] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null);

  const liveEvents = eventData.events || [];

  const todayEvents = liveEvents.filter((event) => {
    if (!event.latitude || !event.longitude || !event.time) return false;
    const eventDateStr = event.time.split(" at ")[0]; // e.g. "Feb 21"
    const eventDate = new Date(`${eventDateStr} ${new Date().getFullYear()}`);
    const today = new Date();
    return (
      eventDate.getFullYear() === today.getFullYear() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getDate() === today.getDate()
    );
  });

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
      setPendingLocation(currentLocation.coords);
      setHotspotLabel("");
      setEditingHotspot(false);
      setShowHotspotModal(true);
    } catch (error) {
      Alert.alert("Error", "Could not get your location.");
      console.log(error);
    } finally {
      setIsReporting(false);
    }
  };

  const handleSubmitHotspot = async () => {
    if (!pendingLocation) return;
    setIsReporting(true);
    try {
      const newWarningPin = {
        latitude: pendingLocation.latitude,
        longitude: pendingLocation.longitude,
        timestamp: new Date().toISOString(),
        name: hotspotLabel.trim() || "Hot Spot",
      };
      const { data, error } = await supabase
        .from("hotspots")
        .insert([newWarningPin])
        .select()
        .single();
      if (error) throw error;
      setMyHotspotId(data.id);
      setShowHotspotModal(false);
      Alert.alert("Radar Updated", "Mark Successful!");
    } catch (error) {
      Alert.alert("Error", "Could not connect to the radar network.");
      console.log(error);
    } finally {
      setIsReporting(false);
    }
  };

  const handleEditHotspot = async () => {
    if (!myHotspotId) return;
    setIsReporting(true);
    try {
      const { error } = await supabase
        .from("hotspots")
        .update({ name: hotspotLabel.trim() || "Hot Spot" })
        .eq("id", myHotspotId);
      if (error) throw error;
      setHotSpots((spots) =>
        spots.map((s) =>
          s.id === myHotspotId
            ? { ...s, name: hotspotLabel.trim() || "Hot Spot" }
            : s,
        ),
      );
      setShowHotspotModal(false);
    } catch (error) {
      Alert.alert("Error", "Could not update the marker.");
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
          {todayEvents.map((event, index) => (
            <Marker
              key={`today-${index}`}
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              pinColor="#CC0000"
            >
              <Callout tooltip>
                <View style={mapCallout.container}>
                  {event.imageUrl ? (
                    <Image
                      source={{ uri: event.imageUrl }}
                      style={mapCallout.image}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={mapCallout.imagePlaceholder}>
                      <Text style={{ fontSize: 28 }}>🎉</Text>
                    </View>
                  )}
                  <View style={mapCallout.info}>
                    <Text style={mapCallout.name} numberOfLines={1}>
                      {event.eventName || event.name}
                    </Text>
                    {event.locationName && (
                      <View style={mapCallout.locationRow}>
                        <Text style={mapCallout.locationIcon}>📍</Text>
                        <Text style={mapCallout.locationText} numberOfLines={1}>
                          {event.locationName}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Callout>
            </Marker>
          ))}

          {focusedEvent && focusedEvent.latitude && focusedEvent.longitude && (
            <Marker
              coordinate={{
                latitude: focusedEvent.latitude,
                longitude: focusedEvent.longitude,
              }}
              pinColor="#CC0000"
            >
              <Callout tooltip>
                <View style={mapCallout.container}>
                  {focusedEvent.imageUrl ? (
                    <Image
                      source={{ uri: focusedEvent.imageUrl }}
                      style={mapCallout.image}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={mapCallout.imagePlaceholder}>
                      <Text style={{ fontSize: 28 }}>🎉</Text>
                    </View>
                  )}
                  <View style={mapCallout.info}>
                    <Text style={mapCallout.name} numberOfLines={1}>
                      {focusedEvent.eventName || focusedEvent.name}
                    </Text>
                    {focusedEvent.locationName && (
                      <View style={mapCallout.locationRow}>
                        <Text style={mapCallout.locationIcon}>📍</Text>
                        <Text style={mapCallout.locationText} numberOfLines={1}>
                          {focusedEvent.locationName}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Callout>
            </Marker>
          )}

          {hotSpots.map((spot, index) => {
            let displayTime = "Recently";
            if (spot.timestamp?.includes("T")) {
              displayTime = new Date(spot.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
            }
            const isOwner = spot.id === myHotspotId;
            return (
              <Marker
                key={`hotspot-${spot.id || index}`}
                coordinate={{
                  latitude: spot.latitude,
                  longitude: spot.longitude,
                }}
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
                <Callout
                  tooltip
                  onPress={() => {
                    if (isOwner) {
                      setHotspotLabel(spot.name || "Hot Spot");
                      setEditingHotspot(true);
                      setShowHotspotModal(true);
                    }
                  }}
                >
                  <View style={hotspotCallout.container}>
                    <View style={hotspotCallout.header}>
                      <Text style={hotspotCallout.name} numberOfLines={1}>
                        {spot.name || "Hot Spot"}
                      </Text>
                    </View>
                    <Text style={hotspotCallout.time}>
                      Reported at {displayTime}
                    </Text>
                    {isOwner && (
                      <View style={hotspotCallout.editBtn}>
                        <Text style={hotspotCallout.editBtnText}>
                          ✏️ Edit Name
                        </Text>
                      </View>
                    )}
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setShowMap(false);
            setFocusedEvent(null);
          }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={handleReportSolicitor}
          disabled={isReporting}
        >
          {isReporting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.reportButtonText}>Mark Hotspot</Text>
          )}
        </TouchableOpacity>

        <HotspotModal
          visible={showHotspotModal}
          label={hotspotLabel}
          editing={editingHotspot}
          isLoading={isReporting}
          onChangeLabel={setHotspotLabel}
          onSubmit={editingHotspot ? handleEditHotspot : handleSubmitHotspot}
          onCancel={() => setShowHotspotModal(false)}
        />
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────
  // HOME VIEW
  // ─────────────────────────────────────────
  return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Rebel Radar</Text>
          <Text style={styles.headerSubtitle}>Discover events near you</Text>
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
              onPress={() => setSelectedEvent(item)}
              onViewMap={() => {
                setFocusedEvent(item);
                setShowMap(true);
              }}
            />
          )}
        />

        {/* Fixed Bottom Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => {
              setFocusedEvent(null);
              setShowMap(true);
            }}
          >
            <Text style={styles.viewAllText}>View Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.hotspotButton}
            onPress={handleReportSolicitor}
            disabled={isReporting}
          >
            {isReporting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.hotspotIcon}>📡</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <EventDetail
            item={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onViewMap={() => {
              setFocusedEvent(selectedEvent);
              setSelectedEvent(null);
              setShowMap(true);
            }}
          />
        )}
      </Modal>

      <HotspotModal
        visible={showHotspotModal}
        label={hotspotLabel}
        editing={editingHotspot}
        isLoading={isReporting}
        onChangeLabel={setHotspotLabel}
        onSubmit={editingHotspot ? handleEditHotspot : handleSubmitHotspot}
        onCancel={() => setShowHotspotModal(false)}
      />
    </>
  );
}

// ─────────────────────────────────────────
// DETAIL STYLES
// ─────────────────────────────────────────
const detail = StyleSheet.create({
  imageContainer: {
    height: 280,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5E6E6",
    justifyContent: "center",
    alignItems: "center",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "transparent",
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  heroBadge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
    lineHeight: 32,
  },
  pillRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5E6E6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pillIcon: {
    fontSize: 14,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#CC0000",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 20,
  },
  highlight: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF0F0",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#CC0000",
  },
  highlightIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#8B0000",
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 24,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#CC0000",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#CC0000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  mapButtonIcon: {
    fontSize: 18,
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

// ─────────────────────────────────────────
// MAIN STYLES
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
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
    color: "#CC0000",
    letterSpacing: -0.5,
    textShadowColor: "rgba(204, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  headerIcon: {
    backgroundColor: "#F5E6E6",
    borderRadius: 50,
    padding: 12,
  },
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
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  cardInner: {
    borderRadius: 20,
    overflow: "hidden",
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
  cardMetaRow: {
    flexDirection: "row",
    gap: 16,
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
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 30,
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  hotspotButton: {
    backgroundColor: "#2D2D2D",
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "#444444",
  },
  hotspotIcon: {
    fontSize: 22,
  },
  viewAllButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#CC0000",
    height: 56,
    borderRadius: 16,
    shadowColor: "#CC0000",
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
    backgroundColor: "#CC0000",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: "#CC0000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  reportButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  redDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#CC0000",
    shadowColor: "#CC0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
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

// ─────────────────────────────────────────
// MAP CALLOUT STYLES
// ─────────────────────────────────────────
const mapCallout = StyleSheet.create({
  container: {
    width: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  image: {
    width: "100%",
    height: 110,
  },
  imagePlaceholder: {
    width: "100%",
    height: 110,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    padding: 12,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationIcon: {
    fontSize: 11,
  },
  locationText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },
});

// ─────────────────────────────────────────
// HOTSPOT CALLOUT STYLES
// ─────────────────────────────────────────
const hotspotCallout = StyleSheet.create({
  container: {
    width: 190,
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  emoji: {
    fontSize: 16,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  time: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  editBtn: {
    marginTop: 10,
    backgroundColor: "#CC0000",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  editBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
});

// ─────────────────────────────────────────
// HOTSPOT MODAL STYLES
// ─────────────────────────────────────────
const hotspotModal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 20,
    lineHeight: 18,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#CC0000",
    alignItems: "center",
    shadowColor: "#CC0000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
