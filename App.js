import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { getApps, initializeApp } from 'firebase/app';
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

const Tab = createBottomTabNavigator();
const { height: screenHeight } = Dimensions.get('window');
const tabBarHeight = 66;
const cardHeight = Math.round(screenHeight - tabBarHeight);
const logoSource = require('./assets/footyfeverz-logo.png');

const theme = {
  background: '#f5f7fb',
  card: '#ffffff',
  highlight: '#16a34a',
  secondary: '#0f172a',
  text: '#0f172a',
  muted: '#6b7280',
  danger: '#e11d48',
};

const fixtures = [
  { id: 'g1', home: 'Real Madrid', away: 'Liverpool', time: 'Today ┬À 20:00', venue: 'Bernabeu' },
  { id: 'g2', home: 'Barcelona', away: 'PSG', time: 'Tomorrow ┬À 21:00', venue: 'Olympic Stadium' },
  { id: 'g3', home: 'Manchester United', away: 'Bayern', time: 'Sat ┬À 17:30', venue: 'Old Trafford' },
  { id: 'g4', home: 'Inter', away: 'Arsenal', time: 'Sun ┬À 19:00', venue: 'San Siro' },
];

const teams = [
  'Real Madrid',
  'Barcelona',
  'Manchester United',
  'Bayern Munich',
  'Liverpool',
  'Manchester City',
  'Arsenal',
  'Chelsea',
  'Tottenham',
  'PSG',
  'Inter',
  'AC Milan',
  'Juventus',
  'Napoli',
  'Dortmund',
  'RB Leipzig',
  'Atletico Madrid',
  'Sevilla',
  'Ajax',
  'Feyenoord',
  'Porto',
  'Benfica',
  'Sporting CP',
  'Marseille',
  'Lyon',
  'Monaco',
  'Flamengo',
  'River Plate',
  'Boca Juniors',
  'LAFC',
  'LA Galaxy',
  'Seattle Sounders',
  'Toronto FC',
  'Celtic',
  'Rangers',
  'Galatasaray',
  'Fenerbahce',
  'Besiktas',
  'Shakhtar Donetsk',
  'Cruz Azul',
];

const firebaseConfig = {
  apiKey: 'AIzaSyCXuCX4NsubI_BNCWYPRlKub36ID8PwFWA',
  authDomain: 'footyfeverz-599b3.firebaseapp.com',
  projectId: 'footyfeverz-599b3',
  storageBucket: 'footyfeverz-599b3.firebasestorage.app',
  messagingSenderId: '238805863228',
  appId: '1:238805863228:web:f14ca0e9e52f26601f6c39',
  measurementId: 'G-Z0MFTE9WKR',
};

let cachedApp;
let cachedDb;
let cachedStorage;

const getAppInstance = () => {
  if (cachedApp) return cachedApp;
  const hasConfig = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;
  if (!hasConfig) return null;

  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    cachedApp = app;
    return cachedApp;
  } catch (error) {
    console.warn('Firestore init failed', error);
    return null;
  }
};

const getDb = () => {
  if (cachedDb) return cachedDb;
  const app = getAppInstance();
  if (!app) return null;
  try {
    cachedDb = getFirestore(app);
    return cachedDb;
  } catch (error) {
    console.warn('getDb failed', error);
    return null;
  }
};

const getStorageInstance = () => {
  if (cachedStorage) return cachedStorage;
  const app = getAppInstance();
  if (!app) return null;
  try {
    const bucket = firebaseConfig.storageBucket || `${firebaseConfig.projectId}.appspot.com`;
    cachedStorage = getStorage(app, bucket);
    return cachedStorage;
  } catch (error) {
    console.warn('getStorage failed', error);
    return null;
  }
};

const ProfileScreen = () => (
  <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>FF</Text>
        </View>
        <Text style={styles.title}>Footy Fever</Text>
        <Text style={styles.muted}>Ultra since 2005 ┬À Global</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: theme.highlight }]}>
            <Ionicons name="flash" size={16} color={theme.background} />
            <Text style={[styles.badgeText, { color: theme.background }]}>Fast Breaks</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.card, borderColor: theme.secondary }]}>
            <MaterialCommunityIcons name="shield-star" size={16} color={theme.secondary} />
            <Text style={[styles.badgeText, { color: theme.secondary }]}>Club Captain</Text>
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Stats</Text>
        <View style={styles.statRow}>
          <Stat label="Matches watched" value="432" />
          <Stat label="Clips liked" value="1.2k" />
          <Stat label="Forum posts" value="87" />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Favorite Clubs</Text>
        <View style={styles.clubRow}>
          {['Real Madrid', 'Barcelona', 'PSG'].map((club) => (
            <View key={club} style={styles.clubChip}>
              <Text style={styles.clubText}>{club}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
);

const GamesScreen = () => (
  <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Upcoming Games</Text>
        {fixtures.map((game) => (
          <View key={game.id} style={styles.gameCard}>
            <View>
              <Text style={styles.gameTeams}>
                {game.home} <Text style={{ color: theme.muted }}>vs</Text> {game.away}
              </Text>
              <Text style={styles.muted}>{game.venue}</Text>
            </View>
            <View style={styles.kickoffTag}>
              <Ionicons name="time-outline" size={16} color="#ffffff" />
              <Text style={styles.kickoffText}>{game.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  </SafeAreaView>
);

const FeedScreen = ({ onReady }) => {
  const [feed, setFeed] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const db = useMemo(() => getDb(), []);
  const storage = useMemo(() => getStorageInstance(), []);
  const videoRefs = useRef({});
  const [activeId, setActiveId] = useState(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const nextId = viewableItems[0]?.item?.id;
      if (nextId) setActiveId(nextId);
    }
  }).current;

  useEffect(() => {
    if (!db) return undefined;

    const q = query(collection(db, 'feed'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled clip',
            club: data.club || '',
            description: data.description || '',
            mediaUrl: data.mediaUrl || data.thumbnail || data.imageUrl || '',
            thumbnail: data.thumbnail || data.imageUrl || '',
            uploader: data.uploader || '@footyfan',
            likes: data.likes || 0,
            comments: data.comments || 0,
            mediaType: data.mediaType || 'image',
          };
        });
        setFeed(items);
        if (!hasLoaded) {
          setHasLoaded(true);
          onReady?.();
        }
      },
      (error) => console.warn('Feed subscription failed', error)
    );
  }, [db, hasLoaded, onReady]);

  useEffect(() => {
    if (!feed.length) return;
    if (!activeId || !feed.find((item) => item.id === activeId)) {
      setActiveId(feed[0].id);
    }
  }, [feed, activeId]);

  useEffect(() => {
    if (!db && !hasLoaded) {
      // If Firebase is not configured, avoid blocking on loader
      setHasLoaded(true);
      onReady?.();
    }
  }, [db, hasLoaded, onReady]);

  useEffect(() => {
    const currentKey = activeId;
    Object.entries(videoRefs.current).forEach(([id, ref]) => {
      if (!ref) return;
      if (id === currentKey) {
        ref.playAsync?.();
        ref.setStatusAsync?.({ shouldPlay: true, isMuted: false });
      } else {
        ref.pauseAsync?.();
        ref.setStatusAsync?.({ shouldPlay: false, isMuted: true });
      }
    });
  }, [activeId]);

  const uploadToStorage = useCallback(
    async (uri, isVideo) => {
      if (!storage) throw new Error('Storage not configured');
      const response = await fetch(uri);
      const blob = await response.blob();
      const extGuess = uri.split('.').pop()?.split('?')[0] || (isVideo ? 'mp4' : 'jpg');
      const storageRef = ref(
        storage,
        `uploads/${Date.now()}-${Math.floor(Math.random() * 10000)}.${extGuess}`
      );
      const contentType = isVideo ? 'video/mp4' : 'image/jpeg';
      await uploadBytes(storageRef, blob, { contentType });
      return getDownloadURL(storageRef);
    },
    [storage]
  );

  const handleAddClip = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Enable photo/video library access to add a clip.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      videoMaxDuration: 30,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    const uri = asset?.uri || '';
    const isVideo = asset?.type === 'video';
    const thumb = uri;

    let uploadedUrl = uri;
    if (db && storage && uri) {
      try {
        const cloudUrl = await uploadToStorage(uri, isVideo);
        if (cloudUrl) uploadedUrl = cloudUrl;
      } catch (error) {
        console.warn('Upload failed, falling back locally', error?.message || error);
        Alert.alert(
          'Upload failed',
          'Could not upload to Firebase Storage. Check storage rules/bucket and try again.'
        );
      }
    }

    if (db) {
      try {
        await addDoc(collection(db, 'feed'), {
          title: 'New footy clip',
          club: '',
          description: 'Describe your moment...',
          mediaUrl: uploadedUrl,
          thumbnail: thumb,
          uploader: '@you',
          likes: 0,
          comments: 0,
          mediaType: isVideo ? 'video' : 'image',
          createdAt: serverTimestamp(),
        });
        return;
      } catch (error) {
        console.warn('Add clip failed, falling back locally', error?.message || error);
        Alert.alert(
          'Save failed',
          'Could not save to Firestore. Check Firestore rules and try again.'
        );
      }
    } else {
      Alert.alert('Firebase not configured', 'Feed will update locally only.');
    }

    // Local fallback so the button still feels responsive
    setFeed((prev) => [
      {
        id: Date.now().toString(),
        title: 'New footy clip',
        club: '',
        description: 'Describe your moment...',
        mediaUrl: uploadedUrl,
        thumbnail: thumb,
        uploader: '@you',
        likes: 0,
        comments: 0,
        mediaType: isVideo ? 'video' : 'image',
      },
      ...prev,
    ]);
  }, [db, storage, uploadToStorage]);

  const renderItem = ({ item }) => {
    const isActive = item.id === activeId;
    return (
      <View style={[styles.tiktokCard, { height: cardHeight }]}>
        {item.mediaType === 'video' && item.mediaUrl ? (
          <Video
            ref={(ref) => {
              if (ref) {
                videoRefs.current[item.id] = ref;
              } else {
                delete videoRefs.current[item.id];
              }
            }}
            source={{ uri: item.mediaUrl }}
            style={styles.tiktokImage}
            resizeMode="cover"
            shouldPlay={isActive}
            isLooping
            isMuted={!isActive}
            useNativeControls={false}
            usePoster
            posterSource={item.thumbnail ? { uri: item.thumbnail } : undefined}
          />
        ) : item.mediaUrl ? (
          <Image source={{ uri: item.mediaUrl }} style={styles.tiktokImage} />
        ) : (
          <View style={[styles.tiktokImage, styles.imageFallback]}>
            <Ionicons name="image" size={28} color={theme.muted} />
            <Text style={styles.muted}>No media yet</Text>
          </View>
        )}

        <View style={styles.tiktokOverlay}>
          <View style={styles.feedBottom}>
            <TouchableOpacity style={styles.uploaderRow}>
              <View style={styles.uploaderAvatar}>
                <Text style={styles.uploaderAvatarText}>
                  {item.uploader?.slice(1, 2)?.toUpperCase() || 'F'}
                </Text>
              </View>
              <Text style={[styles.uploaderHandle, styles.overlayText]}>{item.uploader}</Text>
              <View style={styles.followPill}>
                <Text style={styles.followText}>Follow</Text>
              </View>
            </TouchableOpacity>
            <Text style={[styles.cardTitle, styles.overlayText]}>{item.title}</Text>
            <Text style={[styles.cardDesc, styles.overlayMuted]}>{item.description}</Text>
            <View style={styles.clubTagRow}>
              {item.club ? (
                <View style={styles.clubTag}>
                  <Ionicons name="football" size={14} color="#ffffff" />
                  <Text style={styles.clubTagText}>{item.club}</Text>
                </View>
              ) : null}
              <Text style={[styles.timeago, styles.overlayMuted]}>Just now</Text>
            </View>
          </View>

          <View style={styles.actionRail}>
            <TouchableOpacity style={styles.actionStack}>
              <Ionicons name="heart" size={32} color="#ffffff" />
              <Text style={styles.actionStackLabel}>{formatCount(item.likes)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionStack}>
              <Ionicons name="chatbubble-ellipses" size={32} color="#ffffff" />
              <Text style={styles.actionStackLabel}>{formatCount(item.comments)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionStack}>
              <Ionicons name="share-social" size={30} color="#ffffff" />
              <Text style={styles.actionStackLabel}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionStack}>
              <Ionicons name="bookmark" size={30} color="#ffffff" />
              <Text style={styles.actionStackLabel}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={cardHeight}
        snapToAlignment="center"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={4}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        disableIntervalMomentum
        snapToStart
        snapToEnd
        getItemLayout={(_, index) => ({
          length: cardHeight,
          offset: cardHeight * index,
          index,
        })}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
      />
      <TouchableOpacity style={styles.fab} onPress={handleAddClip} activeOpacity={0.9}>
        <Ionicons name="add" size={28} color={theme.background} />
        <Text style={styles.fabText}>Add clip</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const ForumScreen = () => (
  <SafeAreaView style={styles.screen}>
    <FlatList
      data={teams}
      keyExtractor={(item) => item}
      contentContainerStyle={styles.scroll}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.teamCard}>
          <View style={styles.teamBadge}>
            <Text style={styles.teamBadgeText}>{item.slice(0, 1)}</Text>
          </View>
          <View>
            <Text style={styles.teamName}>{item}</Text>
            <Text style={styles.muted}>Tap to enter the discussion</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} />
        </TouchableOpacity>
      )}
    />
  </SafeAreaView>
);

const Stat = ({ label, value }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.muted}>{label}</Text>
  </View>
);

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.background,
    card: theme.card,
    text: theme.text,
    border: '#e5e7eb',
  },
};

const formatCount = (count) => {
  if (count >= 1000000) return `${Math.floor(count / 100000) / 10}m`;
  if (count >= 1000) return `${Math.floor(count / 100) / 10}k`;
  return String(count);
};

export default function App() {
  const [feedReady, setFeedReady] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <Tab.Navigator
            initialRouteName="Feed"
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: styles.tabBar,
              tabBarActiveTintColor: theme.highlight,
              tabBarInactiveTintColor: theme.muted,
              tabBarIcon: ({ color, size }) => {
                if (route.name === 'Profile') return <Ionicons name="person" size={size} color={color} />;
                if (route.name === 'Games') return <MaterialCommunityIcons name="soccer" size={size} color={color} />;
                if (route.name === 'Feed') return <Ionicons name="play-circle" size={size} color={color} />;
                return <FontAwesome5 name="users" size={size - 2} color={color} />;
              },
            })}
          >
            <Tab.Screen name="Profile" component={ProfileScreen} />
            <Tab.Screen name="Games" component={GamesScreen} />
            <Tab.Screen name="Feed">
              {() => <FeedScreen onReady={() => setFeedReady(true)} />}
            </Tab.Screen>
            <Tab.Screen name="Forum" component={ForumScreen} />
          </Tab.Navigator>
          {!feedReady && (
            <View style={styles.loaderOverlay}>
              <Animated.Image source={logoSource} style={[styles.loaderImage, { transform: [{ scale }], opacity }]} />
            </View>
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scroll: {
    padding: 16,
  },
  heroCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 24,
  },
  title: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '700',
  },
  muted: {
    color: theme.muted,
    marginTop: 4,
    fontSize: 13,
  },
  badges: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  badgeText: {
    fontWeight: '600',
    color: theme.text,
    fontSize: 13,
  },
  panel: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 14,
  },
  panelTitle: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#eef2f7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
  },
  clubRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  clubChip: {
    backgroundColor: '#eef2f7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  clubText: {
    color: theme.text,
    fontWeight: '600',
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  feedCard: {
    backgroundColor: theme.card,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  feedImage: {
    width: '100%',
    height: 260,
  },
  feedOverlay: {
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardDesc: {
    color: theme.muted,
    fontSize: 14,
  },
  feedActions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
  },
  actionButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#1b223d',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 13,
  },
  gameCard: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameTeams: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 15,
  },
  kickoffTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.highlight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  teamCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  teamBadgeText: {
    color: theme.secondary,
    fontWeight: '700',
    fontSize: 18,
  },
  teamName: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 15,
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e5e7eb',
    height: tabBarHeight,
    paddingBottom: 10,
    paddingTop: 10,
  },
  // TikTok-style feed styles
  tiktokCard: {
    width: '100%',
    backgroundColor: theme.card,
    borderColor: '#e5e7eb',
    borderWidth: 0,
    borderRadius: 0,
    marginVertical: 0,
    overflow: 'hidden',
  },
  tiktokImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tiktokOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  feedBottom: {
    flex: 1,
    paddingRight: 12,
    gap: 6,
    justifyContent: 'flex-end',
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uploaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  uploaderAvatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
  },
  uploaderHandle: {
    fontWeight: '700',
  },
  followPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.highlight,
    borderRadius: 999,
  },
  followText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  clubTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clubTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  clubTagText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  timeago: {
    color: theme.muted,
    fontSize: 12,
  },
  actionRail: {
    width: 70,
    alignItems: 'center',
    gap: 14,
    marginBottom: tabBarHeight + 6,
  },
  actionStack: {
    alignItems: 'center',
  },
  actionStackLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: theme.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 6,
  },
  fabText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loaderImage: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
  },
  overlayText: {
    color: '#ffffff',
  },
  overlayMuted: {
    color: '#e5e7eb',
  },
  kickoffText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});

