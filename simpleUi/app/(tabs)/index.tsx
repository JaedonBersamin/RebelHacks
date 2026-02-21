import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { createClient } from '@supabase/supabase-js';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import eventData from './map_ready_events.json';

// 1. Initialize Supabase connecting to your cloud database
const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export default function App() {
  const [locationPermission, setLocationPermission] = useState(null);
  const [hotSpots, setHotSpots] = useState([]);
  const [isReporting, setIsReporting] = useState(false);

  const liveEvents = eventData.events || [];
  const activeMapEvents = liveEvents.filter(event => event.showOnMap === true && event.latitude && event.longitude);

  const UNLV_REGION = {
    latitude: 36.1069,
    longitude: -115.1405,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };


  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      // Fetch all existing hot spots from Supabase when the app opens
      const twentyMinsAgoISO = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      const { data, error } = await supabase
          .from('hotspots')
          .select('*')
          .gte('timestamp', twentyMinsAgoISO);
      if (data) setHotSpots(data);
    })();

    // Subscribe to real-time changes
    const subscription = supabase
        .channel('public:hotspots')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hotspots' }, payload => {
          setHotSpots(currentSpots => [...currentSpots, payload.new]);
        })
        .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

//second UseEffect

  // JOB 2:  1-MINUTE

  useEffect(() => {
    const sweepRadar = setInterval(() => {
      // Temporarily set to 1 minute for testing (1 * 60 * 1000)
      const oneMinAgo = new Date(Date.now() - 20 * 60 * 1000);

      setHotSpots(currentSpots =>
          currentSpots.filter(spot => {
            if (!spot.timestamp || !spot.timestamp.includes('T')) return false;

            const pinTime = new Date(spot.timestamp);
            return pinTime > oneMinAgo;
          })
      );
    }, 10000); // Wakes up every 10 seconds now

    return () => clearInterval(sweepRadar);
  }, []);

  const handleReportSolicitor = async () => {
    if (!locationPermission) {
      Alert.alert("Permission Denied", "We need your location to drop a warning pin!");
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
        timestamp: new Date().toISOString(), // Raw computer time for the database
      };

      setHotSpots(currentSpots => [...currentSpots, newWarningPin]);

      const { error } = await supabase.from('hotspots').insert([newWarningPin]);

      if (error) throw error;

      Alert.alert("Radar Updated", "Mark Successful!");
    } catch (error) {
      Alert.alert("Error", "Could not connect to the radar network.");
      console.log(error);
    } finally {
      setIsReporting(false);
    }
  };

  const renderItem = ({ item }) => (
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.eventTitle}>{item.eventName}</Text>
          {item.showOnMap && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveText}>LIVE</Text>
              </View>
          )}
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.eventDetails}>{item.time} • {item.locationName}</Text>
          <Text style={styles.coolBadge}>{item.coolFactor}</Text>
        </View>
      </TouchableOpacity>
  );

  return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Campus Intel</Text>
        </View>

        <View style={styles.mapContainer}>
          <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={UNLV_REGION}
              showsUserLocation={locationPermission}
              showsMyLocationButton={true}
          >
            {/* STANDARD EVENTS */}
            {activeMapEvents.map((event, index) => (
                <Marker
                    key={`event-${index}`}
                    coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                    title={event.eventName}
                    description={event.coolFactor}
                    pinColor="#E53E3E"
                />
            ))}

            {/* HOT SPOTS */}
            {hotSpots.map((spot, index) => {
              // Format the raw database string back into human time (e.g., "04:32 PM")
              let displayTime = "Recently";
              if (spot.timestamp && spot.timestamp.includes('T')) {
                displayTime = new Date(spot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }

              return (
                  <Marker
                      key={`hotspot-${spot.id || index}`}
                      coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
                      title="⚠️ Active Hot Spot"
                      description={`Reported at ${displayTime}`}
                  >
                    <View style={{ width: 60, height: 60, justifyContent: 'center', alignItems: 'center' }}>
                      <Svg height="60" width="60" viewBox="0 0 60 60" style={{ position: 'absolute' }}>
                        <Defs>
                          <RadialGradient id="grad" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                            <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
                            <Stop offset="40%" stopColor="#EF4444" stopOpacity="0.4" />
                            <Stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
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
        </View>

        <FlatList
            data={liveEvents}
            keyExtractor={(item, index) => `${item.eventName}-${index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F4' },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5E5', backgroundColor: '#FFFFFF' },
  headerText: { fontSize: 24, fontWeight: '800', color: '#2D2D2A', letterSpacing: -0.5 },
  mapContainer: { height: Dimensions.get('window').height * 0.45, width: '100%', borderBottomWidth: 2, borderBottomColor: '#E5E5E5', position: 'relative' },
  map: { flex: 1 },
  reportButton: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: '#1A1A1A', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, borderWidth: 1, borderColor: '#333333' },
  reportButtonText: { color: '#F97316', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  listContainer: { padding: 20, gap: 16 },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eventTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginRight: 10 },
  liveBadge: { backgroundColor: '#22C55E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  description: { fontSize: 14, color: '#666666', marginBottom: 16, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventDetails: { fontSize: 13, color: '#888888', fontWeight: '600', flex: 1 },
  coolBadge: { fontSize: 12, fontWeight: '700', color: '#4A4A4A', backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, overflow: 'hidden', maxWidth: '45%', textAlign: 'center' },
  snapMapInnerCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 5 },
});