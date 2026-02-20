import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

// Mock data to test the UI before the Python scraper is ready
const MOCK_EVENTS = [
  { id: '1', title: 'Free Nashville Hot Chicken', location: 'Student Union', time: '12:00 PM', distance: '0.2m' },
  { id: '2', title: 'Mediterranean Grill Pop-up', location: 'Academic Mall', time: '1:00 PM', distance: '0.4m' },
  { id: '3', title: 'Lindt 95% Dark Chocolate Tasting', location: 'Lied Library', time: '3:00 PM', distance: '0.1m' },
  { id: '4', title: 'CS Dept: Resume Workshop', location: 'TBE', time: '4:00 PM', distance: '0.6m' },
];

export default function App() {
  const [showMap, setShowMap] = useState(false);

  // This function dictates exactly how a single "bubble" looks
  const renderItem = ({ item }) => (
      <TouchableOpacity style={styles.card}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.eventDetails}>{item.time} • {item.location}</Text>
          <Text style={styles.distanceBadge}>{item.distance}</Text>
        </View>
      </TouchableOpacity>
  );

  return (
      <SafeAreaView style={styles.container}>
        {/* Top Header & Toggle Button */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Radar App+Jaedon is cute :3</Text>
          <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowMap(!showMap)}
          >
            <Text style={styles.toggleText}>{showMap ? 'Show List' : 'Map Radar'}</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        {!showMap ? (
            <FlatList
                data={MOCK_EVENTS}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />
        ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapText}>[ Mapbox Radar Active ]</Text>
            </View>
        )}
      </SafeAreaView>
  );
}

// Minimalist, clean styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F4', // Clean, muted off-white
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D2D2A',
    letterSpacing: -0.5,
  },
  toggleButton: {
    backgroundColor: '#2D2D2A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  toggleText: {
    color: '#F5F5F4',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    padding: 20,
    gap: 16, // Clean spacing between cards
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
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDetails: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  distanceBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A4A4A',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2D2D2A',
  },
  mapText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  }
});