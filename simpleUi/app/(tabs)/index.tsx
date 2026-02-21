import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

// Import your backend data
import eventData from './map_ready_events.json';

export default function App() {
  const [locationPermission, setLocationPermission] = useState(null);

  // Safely grab the array of events
  const liveEvents = eventData.events || [];

  // Filter out only the events happening TODAY to show on the map
  const activeMapEvents = liveEvents.filter(event => event.showOnMap === true && event.latitude && event.longitude);

  // The center of the UNLV Campus
  const UNLV_REGION = {
    latitude: 36.1069,
    longitude: -115.1405,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  // Ask the user for GPS permissions when the app opens
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();
  }, []);

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

        {/* THE LIVE MAP */}
        <View style={styles.mapContainer}>
          <MapView
              provider={PROVIDER_GOOGLE} // THIS FORCES GOOGLE MAPS ON IPHONE
              style={styles.map}
              initialRegion={UNLV_REGION}
              showsUserLocation={locationPermission}
              showsMyLocationButton={true}
          >
            {/* Loop through ONLY today's active events and drop pins */}
            {activeMapEvents.map((event, index) => (
                <Marker
                    key={index}
                    coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                    title={event.eventName}
                    description={event.coolFactor}
                    pinColor="#E53E3E" // A sharp red pin for active events
                />
            ))}
          </MapView>
        </View>

        {/* THE SCROLLING LIST */}
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
  container: {
    flex: 1,
    backgroundColor: '#F5F5F4',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D2D2A',
    letterSpacing: -0.5,
  },
  mapContainer: {
    height: Dimensions.get('window').height * 0.4, // Takes up top 40% of the screen
    width: '100%',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E5E5',
  },
  map: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginRight: 10,
  },
  liveBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDetails: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '600',
    flex: 1,
  },
  coolBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A4A4A',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
    maxWidth: '45%',
    textAlign: 'center',
  },
});