import 'react-native-gesture-handler';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Share,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as ImageManipulator from 'expo-image-manipulator';
import { Video } from 'expo-av';
import { NavigationContainer, DefaultTheme, useFocusEffect, useNavigation, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { getApps, initializeApp } from 'firebase/app';
import {
  addDoc,
  collection,
  getFirestore,
  getDoc,
  onSnapshot,
  getDocs,
  orderBy,
  query,
  startAfter,
  limit,
  serverTimestamp,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  doc,
  increment,
  where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from 'firebase/storage';

const Tab = createBottomTabNavigator();
const { height: screenHeight } = Dimensions.get('window');
const tabBarHeight = 66;
const cardHeight = Math.round(screenHeight - tabBarHeight);
const AuthContext = React.createContext({
  user: '@guest',
  login: () => {},
  signup: () => {},
  logout: () => {},
  requireAuth: () => {},
});
const PAGE_SIZE = 10;
const FEED_CACHE_PATH = `${FileSystem.documentDirectory || ''}feed-cache.json`;
const CDN_HOST = ''; // set to your CDN domain (e.g., cdn.footyfeverz.com); leave '' to disable rewriting

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

const forumTeams = [
  { name: 'Real Madrid', logo: require('./assets/teams/real-madrid.png') },
  { name: 'Barcelona', logo: require('./assets/teams/barcelona.png') },
  { name: 'Manchester City', logo: require('./assets/teams/man-city.png') },
  { name: 'Manchester United', logo: require('./assets/teams/man-united.png') },
  { name: 'Arsenal', logo: require('./assets/teams/arsenal.png') },
  { name: 'Chelsea', logo: require('./assets/teams/chelsea.png') },
  { name: 'Liverpool', logo: require('./assets/teams/liverpool.png') },
  { name: 'Tottenham', logo: require('./assets/teams/tottenham.png') },
  { name: 'Bayern Munich', logo: require('./assets/teams/bayern-munich.png') },
  { name: 'Bayer Leverkusen', logo: require('./assets/teams/bayer-leverkusen.png') },
  { name: 'Borussia Dortmund', logo: require('./assets/teams/borussia-dortmund.png') },
  { name: 'Juventus', logo: require('./assets/teams/juventus.png') },
  { name: 'Inter Milan', logo: require('./assets/teams/inter-milan.png') },
  { name: 'AC Milan', logo: require('./assets/teams/ac-milan.png') },
  { name: 'PSG', logo: require('./assets/teams/psg.png') },
  { name: 'Lyon', logo: require('./assets/teams/lyon.png') },
  { name: 'Olympique Marseille', logo: require('./assets/teams/olympique-marseille.png') },
  { name: 'SL Benfica', logo: require('./assets/teams/sl-benfica.png') },
  { name: 'FC Porto', logo: require('./assets/teams/fc-porto.png') },
  { name: 'Al Nassr', logo: require('./assets/teams/al-nassr.png') },
  { name: 'Al Hilal', logo: require('./assets/teams/al-hilal.png') },
  { name: 'Al Ittihad', logo: require('./assets/teams/al-ittihad.png') },
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

const applyCdn = (url) => {
  if (!CDN_HOST || !url) return url;
  try {
    const u = new URL(url);
    u.host = CDN_HOST.replace(/^https?:\/\//, '');
    return u.toString();
  } catch {
    return url;
  }
};

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

const fallbackUploads = [
  {
    id: 'up1',
    title: 'Training ground screamer',
    mediaUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80',
    mediaType: 'image',
  },
  {
    id: 'up2',
    title: 'Matchday tifo',
    mediaUrl: 'https://images.unsplash.com/photo-1521417531058-0fdfbdd7e9bf?auto=format&fit=crop&w=1200&q=80',
    mediaType: 'image',
  },
];

const ProfileScreen = ({ route }) => {
  const { user, login, signup, logout } = useContext(AuthContext);
  const [uploads, setUploads] = useState(fallbackUploads);
  const [avatarUri, setAvatarUri] = useState(null);
  const [bio, setBio] = useState('');
  const [showBioInput, setShowBioInput] = useState(false);
  const [preview, setPreview] = useState({ visible: false, item: null });
  const db = useMemo(() => getDb(), []);
  const viewedHandle = route?.params?.userHandle || user;
  const isGuest = !user || user === '@guest';
  const isOwnProfile = !viewedHandle || viewedHandle === user;
  const profileCacheRef = useRef({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [followersList, setFollowersList] = useState([]);
  const [listModal, setListModal] = useState({ visible: false, type: 'following' });
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    if (!db || !viewedHandle) return undefined;
    const q = query(collection(db, 'feed'), where('uploader', '==', viewedHandle), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled',
            mediaUrl: data.mediaUrl || data.thumbnail || '',
            mediaType: data.mediaType || 'image',
          };
        });
        setUploads(list);
      },
      (err) => console.warn('Profile uploads failed', err)
    );
  }, [db, viewedHandle]);

  useEffect(() => {
    if (!db || !viewedHandle) return;
    (async () => {
      try {
        const targetDoc = await getDoc(doc(db, 'follows', viewedHandle));
        setFollowingList(targetDoc.exists() ? targetDoc.data()?.following || [] : []);
        const snaps = await getDocs(collection(db, 'follows'));
        const followers = [];
        snaps.forEach((d) => {
          const arr = d.data()?.following || [];
          if (arr.includes(viewedHandle)) followers.push(d.id);
        });
        setFollowersList(followers);
      } catch (err) {
        console.warn('Load follows failed', err);
      }
    })();
  }, [db, viewedHandle]);

  useEffect(() => {
    // Reset settings dropdown when switching profiles
    setSettingsVisible(false);
    // Load cached profile data per handle (session-only)
    const cached = profileCacheRef.current[viewedHandle || ''] || {};
    setAvatarUri(cached.avatarUri || null);
    setBio(cached.bio || '');
  }, [viewedHandle]);

  useEffect(() => {
    // Cache current profile data by handle
    const key = viewedHandle || '';
    profileCacheRef.current[key] = { avatarUri, bio };
  }, [avatarUri, bio, viewedHandle]);

  useEffect(() => {
    if (!db || isGuest || !viewedHandle || isOwnProfile) {
      setIsFollowing(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'follows', user),
      (snap) => {
        const data = snap.data();
        const following = data?.following || [];
        setIsFollowing(following.includes(viewedHandle));
      },
      (err) => console.warn('Follow state failed', err)
    );
    return () => unsub();
  }, [db, isGuest, user, viewedHandle, isOwnProfile]);

  const toggleFollow = useCallback(async () => {
    if (isGuest) {
      login();
      return;
    }
    if (!db || !viewedHandle || isOwnProfile) return;
    try {
      if (isFollowing) {
        await setDoc(
          doc(db, 'follows', user),
          { following: arrayRemove(viewedHandle) },
          { merge: true }
        );
      } else {
        await setDoc(
          doc(db, 'follows', user),
          { following: arrayUnion(viewedHandle) },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('Toggle follow failed', err);
    }
  }, [db, isFollowing, isGuest, isOwnProfile, user, viewedHandle, login]);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Enable photo library access to update your photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) setAvatarUri(uri);
  };

  if (isGuest) {
   return (
     <SafeAreaView style={styles.screen}>
       <View style={[styles.heroCard, { alignItems: 'center' }]}>
         <Text style={styles.title}>Welcome to FootyFeverz</Text>
         <Text style={styles.muted}>Log in or sign up to view your profile and uploads.</Text>
         <View style={styles.authRow}>
           <TouchableOpacity style={styles.authButton} onPress={signup}>
             <Text style={styles.authButtonText}>Sign up</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[styles.authButton, styles.authButtonOutline]} onPress={login}>
             <Text style={[styles.authButtonText, { color: theme.secondary }]}>Log in</Text>
           </TouchableOpacity>
         </View>
       </View>
     </SafeAreaView>
   );
 }

  return (
    <SafeAreaView style={styles.screen}>
      <TouchableWithoutFeedback onPress={() => settingsVisible && setSettingsVisible(false)}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 80 }]}>
            <View style={styles.profileHeaderRow}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setSettingsVisible((v) => !v)}
              >
                <Ionicons name="settings-sharp" size={22} color={theme.secondary} />
              </TouchableOpacity>
              {settingsVisible ? (
                <View style={styles.settingsDropdown}>
                  <TouchableOpacity style={styles.settingsItem} onPress={logout}>
                    <Text style={styles.settingsItemText}>Log out</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.settingsItem, styles.deleteButton]}
                    onPress={() =>
                      Alert.alert('Delete account', 'Type DELETE to confirm', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => logout(),
                        },
                      ])
                    }
                  >
                    <Text style={[styles.settingsItemText, styles.deleteButtonText]}>Delete account</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
        <View style={styles.heroCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarPlaceholderText}>Upload photo</Text>
                </View>
              )}
              <TouchableOpacity style={styles.avatarEditBadge} onPress={handlePickAvatar}>
                <Ionicons name="camera" size={16} color={theme.background} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.title}>{viewedHandle || 'Your profile'}</Text>
          {!isOwnProfile ? (
            <View style={styles.followRow}>
              <TouchableOpacity style={styles.followButton} onPress={toggleFollow}>
                <Text style={styles.followButtonText}>{isFollowing ? 'Unfollow' : 'Follow'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={styles.followListRow}>
            <TouchableOpacity
              style={styles.followStatButton}
              onPress={() => setListModal({ visible: true, type: 'following' })}
            >
              <Text style={styles.followListLabel}>Following</Text>
              <Text style={styles.followListCount}>{followingList.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.followStatButton}
              onPress={() => setListModal({ visible: true, type: 'followers' })}
            >
              <Text style={styles.followListLabel}>Followers</Text>
              <Text style={styles.followListCount}>{followersList.length}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.addBioButton} onPress={() => setShowBioInput((s) => !s)}>
            <Text style={styles.addBioText}>{bio ? 'Edit bio' : 'Add bio'}</Text>
          </TouchableOpacity>
          {showBioInput ? (
            <View style={styles.bioInputWrapper}>
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Add bio"
                placeholderTextColor={theme.muted}
                multiline
              />
              <TouchableOpacity onPress={() => setShowBioInput(false)}>
                <Text style={styles.addBioText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {bio ? <Text style={styles.bio}>{bio}</Text> : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Uploads</Text>
          {uploads.length === 0 ? (
            <Text style={styles.muted}>No uploads yet. Share your first clip!</Text>
          ) : (
            <View style={styles.uploadGrid}>
              {uploads.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.uploadCard}
                  activeOpacity={0.85}
                  onPress={() => setPreview({ visible: true, item })}
                >
                  {item.mediaType === 'video' ? (
                    <Video
                      source={{ uri: item.mediaUrl }}
                      style={styles.uploadImage}
                      resizeMode="cover"
                      shouldPlay={false}
                      isMuted
                      usePoster
                      posterSource={item.mediaUrl ? { uri: item.mediaUrl } : undefined}
                    />
                  ) : item.mediaUrl ? (
                    <Image source={{ uri: item.mediaUrl }} style={styles.uploadImage} />
                  ) : (
                    <View style={[styles.uploadImage, styles.imageFallback]}>
                      <Ionicons name="image" size={24} color={theme.muted} />
                    </View>
                  )}
                  <Text numberOfLines={1} style={styles.uploadTitle}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <Modal visible={preview.visible} transparent animationType="fade" onRequestClose={() => setPreview({ visible: false, item: null })}>
          <TouchableWithoutFeedback onPress={() => setPreview({ visible: false, item: null })}>
            <View style={styles.previewOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.previewContent}>
                  {preview.item?.mediaType === 'video' ? (
                    <Video
                      source={{ uri: preview.item.mediaUrl }}
                      style={styles.previewMedia}
                      resizeMode="contain"
                      shouldPlay
                      useNativeControls
                    />
                  ) : preview.item?.mediaUrl ? (
                    <Image source={{ uri: preview.item.mediaUrl }} style={styles.previewMedia} />
                  ) : null}
                  <TouchableOpacity style={styles.previewClose} onPress={() => setPreview({ visible: false, item: null })}>
                    <Text style={styles.previewCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </ScrollView>
      <Modal
        visible={listModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setListModal({ visible: false, type: 'following' })}
      >
        <TouchableWithoutFeedback onPress={() => setListModal({ visible: false, type: 'following' })}>
          <View style={styles.previewOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.previewContent, { backgroundColor: '#fff', padding: 16, borderRadius: 16 }]}>
                <Text style={[styles.panelTitle, { color: theme.text }]}>
                  {listModal.type === 'followers' ? 'Followers' : 'Following'}
                </Text>
                <ScrollView contentContainerStyle={{ gap: 8 }}>
                  {(listModal.type === 'followers' ? followersList : followingList).length === 0 ? (
                    <Text style={styles.muted}>No users yet.</Text>
                  ) : (
                    (listModal.type === 'followers' ? followersList : followingList).map((h) => (
                      <Text key={`lst-${h}`} style={styles.followListItem}>
                        {h}
                      </Text>
                    ))
                  )}
                </ScrollView>
                <TouchableOpacity
                  style={styles.previewClose}
                  onPress={() => setListModal({ visible: false, type: 'following' })}
                >
                  <Text style={styles.previewCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

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
  const { user, requireAuth } = useContext(AuthContext);
  const [feed, setFeed] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [liked, setLiked] = useState({});
  const [commentModal, setCommentModal] = useState({ visible: false, item: null, text: '' });
  const [commentLoading, setCommentLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState({});
  const db = useMemo(() => getDb(), []);
  const storage = useMemo(() => getStorageInstance(), []);
  const videoRefs = useRef({});
  const [activeId, setActiveId] = useState(null);
  const [isFocused, setIsFocused] = useState(true);
  const lastDocRef = useRef(null);
  const likeTimersRef = useRef({});
  const lastSentLikeRef = useRef({});
  const likedRef = useRef({});
  const cacheLoadedRef = useRef(false);
  const isGuest = !user || user === '@guest';
  const navigation = useNavigation();
  const [profilePreview, setProfilePreview] = useState({ visible: false, handle: null });
  const [previewUploads, setPreviewUploads] = useState([]);
  const [previewFollowing, setPreviewFollowing] = useState(false);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const nextId = viewableItems[0]?.item?.id;
      if (nextId) setActiveId(nextId);
    }
  }).current;

  const mapFeedDoc = useCallback((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: data.title || 'Untitled clip',
      club: data.club || '',
      description: data.description || '',
      mediaUrl: applyCdn(data.mediaUrl || data.thumbnail || data.imageUrl || ''),
      thumbnail: applyCdn(data.thumbnail || data.imageUrl || data.mediaUrl || ''),
      uploader: data.uploader || '@footyfan',
      likes: data.likes || 0,
      comments: data.comments || 0,
      mediaType: data.mediaType || 'image',
      commentsList: [],
    };
  }, []);

  const dedupeById = useCallback((list) => {
    const seen = new Set();
    return list.filter((item) => {
      const key = item?.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const fetchPage = useCallback(
    async (reset = false) => {
      if (!db) {
        if (!hasLoaded) {
          setHasLoaded(true);
          onReady?.();
        }
        return;
      }
      if (loadingPage) return;
      if (!reset && !hasMore) return;

      setLoadingPage(true);
      try {
        const baseQuery = query(collection(db, 'feed'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
        const pagedQuery =
          !reset && lastDocRef.current
            ? query(collection(db, 'feed'), orderBy('createdAt', 'desc'), startAfter(lastDocRef.current), limit(PAGE_SIZE))
            : baseQuery;
        const snapshot = await getDocs(pagedQuery);
        const items = snapshot.docs.map(mapFeedDoc);
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setFeed((prev) => {
          const next = reset ? items : [...prev, ...items];
          return dedupeById(next);
        });
        if (!hasLoaded) {
          setHasLoaded(true);
          onReady?.();
        }
      } catch (error) {
        console.warn('Feed fetch failed', error);
        if (!hasLoaded) {
          setHasLoaded(true);
          onReady?.();
        }
      } finally {
        setLoadingPage(false);
        if (reset) setRefreshing(false);
      }
    },
    [db, hasLoaded, hasMore, loadingPage, mapFeedDoc, onReady, dedupeById]
  );

  useEffect(() => {
    (async () => {
      if (cacheLoadedRef.current || !FEED_CACHE_PATH) return;
      cacheLoadedRef.current = true;
      try {
        const cached = await FileSystem.readAsStringAsync(FEED_CACHE_PATH);
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) {
          const deduped = dedupeById(parsed);
          setFeed(deduped);
          setActiveId(deduped[0]?.id || null);
          setHasLoaded(true);
        }
      } catch (err) {
        // ignore cache miss
      } finally {
        fetchPage(true);
      }
    })();
  }, [dedupeById, fetchPage]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    lastDocRef.current = null;
    setHasMore(true);
    fetchPage(true);
  }, [fetchPage]);

  useEffect(() => {
    if (!feed.length) return;
    if (!activeId || !feed.find((item) => item.id === activeId)) {
      setActiveId(feed[0].id);
    }
  }, [feed, activeId]);

  useEffect(() => {
    likedRef.current = liked;
  }, [liked]);

  useEffect(() => {
    if (!FEED_CACHE_PATH) return;
    // write a lightweight cache (top 30 items)
    const toCache = feed.slice(0, 30);
    FileSystem.writeAsStringAsync(FEED_CACHE_PATH, JSON.stringify(toCache)).catch(() => {});
  }, [feed]);

  const loadCommentsForItem = useCallback(
    async (item) => {
      if (!db || !item) return;
      setCommentLoading(true);
      try {
        const snap = await getDoc(doc(db, 'feed', item.id));
        if (snap.exists()) {
          const data = snap.data();
          const commentsList = data.commentsList || [];
          const comments = data.comments || commentsList.length;
          setFeed((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, commentsList, comments } : it))
          );
        }
      } catch (err) {
        console.warn('Load comments failed', err);
      } finally {
        setCommentLoading(false);
      }
    },
    [db]
  );

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
      if (id === currentKey && isFocused) {
        ref.playAsync?.();
        ref.setStatusAsync?.({ shouldPlay: true, isMuted: false });
      } else {
        ref.pauseAsync?.();
        ref.setStatusAsync?.({ shouldPlay: false, isMuted: true });
      }
    });
  }, [activeId, isFocused]);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
        Object.values(videoRefs.current).forEach((ref) => {
          ref?.pauseAsync?.();
          ref?.setStatusAsync?.({ shouldPlay: false, isMuted: true });
        });
      };
    }, [])
  );

  const handleSubmitComment = useCallback(async () => {
    if (!user || user === '@guest') {
      requireAuth();
      return;
    }
    if (!commentModal.item || !commentModal.text.trim()) {
      setCommentModal({ visible: false, item: null, text: '' });
      return;
    }
    const newComment = { author: user || '@anon', text: commentModal.text.trim(), createdAt: Date.now() };
    setFeed((prev) =>
      prev.map((it) =>
        it.id === commentModal.item.id
          ? {
              ...it,
              comments: Math.max(0, (it.comments || 0) + 1),
              commentsList: [...(it.commentsList || []), newComment],
            }
          : it
      )
    );
    if (db) {
      try {
        await updateDoc(doc(db, 'feed', commentModal.item.id), {
          commentsList: arrayUnion(newComment),
          comments: increment(1),
        });
      } catch (err) {
        console.warn('Persist comment failed', err);
      }
    }
    setCommentModal({ visible: false, item: null, text: '' });
  }, [commentModal, db, requireAuth, user]);

  const activeComments = useMemo(() => {
    if (!commentModal.item) return [];
    const match = feed.find((it) => it.id === commentModal.item.id);
    return match?.commentsList || [];
  }, [feed, commentModal.item]);

  const loadProfilePreview = useCallback(
    (handle) => {
      if (!db || !handle) return undefined;
      const q = query(collection(db, 'feed'), where('uploader', '==', handle), orderBy('createdAt', 'desc'));
      return onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || 'Untitled',
              mediaUrl: data.mediaUrl || data.thumbnail || '',
              mediaType: data.mediaType || 'image',
            };
          });
          setPreviewUploads(list);
        },
        (err) => console.warn('Preview load failed', err)
      );
    },
    [db]
  );

  const checkPreviewFollowing = useCallback(
    (handle) => {
      if (!db || isGuest || !handle) {
        setPreviewFollowing(false);
        return () => {};
      }
      return onSnapshot(
        doc(db, 'follows', user),
        (snap) => {
          const following = snap.data()?.following || [];
          setPreviewFollowing(following.includes(handle));
        },
        (err) => console.warn('Preview follow check failed', err)
      );
    },
    [db, isGuest, user]
  );

  const openProfilePreview = useCallback(
    (handle) => {
      setProfilePreview({ visible: true, handle });
      loadProfilePreview(handle);
      checkPreviewFollowing(handle);
    },
    [checkPreviewFollowing, loadProfilePreview]
  );

  const togglePreviewFollow = useCallback(async () => {
    const handle = profilePreview.handle;
    if (!handle) return;
    if (isGuest) {
      requireAuth();
      return;
    }
    if (!db) return;
    try {
      if (previewFollowing) {
        await setDoc(doc(db, 'follows', user), { following: arrayRemove(handle) }, { merge: true });
      } else {
        await setDoc(doc(db, 'follows', user), { following: arrayUnion(handle) }, { merge: true });
      }
    } catch (err) {
      console.warn('Preview follow toggle failed', err);
    }
  }, [db, isGuest, previewFollowing, profilePreview.handle, requireAuth, user]);

  const handleToggleLike = useCallback(
    (item) => {
      if (isGuest) {
        requireAuth();
        return;
      }
      const wasLiked = !!liked[item.id];
      const nextLiked = !wasLiked;
      const delta = nextLiked ? 1 : -1;
      setLiked((prev) => ({ ...prev, [item.id]: nextLiked }));
      setFeed((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, likes: Math.max(0, (it.likes || 0) + delta) } : it
        )
      );

      if (likeTimersRef.current[item.id]) clearTimeout(likeTimersRef.current[item.id]);
      likeTimersRef.current[item.id] = setTimeout(async () => {
        const finalLiked = likedRef.current[item.id];
        const lastSent = lastSentLikeRef.current[item.id] || false;
        if (finalLiked === lastSent || !db) return;
        const sendDelta = finalLiked ? 1 : -1;
        try {
          await updateDoc(doc(db, 'feed', item.id), { likes: increment(sendDelta) });
          lastSentLikeRef.current[item.id] = finalLiked;
        } catch (err) {
          console.warn('Persist like failed', err);
        }
      }, 500);
    },
    [db, liked, isGuest, requireAuth]
  );

  const uploadToStorage = useCallback(
    async (uri, isVideo, onProgress) => {
      if (!storage) throw new Error('Storage not configured');
      const response = await fetch(uri);
      const blob = await response.blob();
      const extGuess = uri.split('.').pop()?.split('?')[0] || (isVideo ? 'mp4' : 'jpg');
      const storageRef = ref(
        storage,
        `uploads/${Date.now()}-${Math.floor(Math.random() * 10000)}.${extGuess}`
      );
      const contentType = isVideo ? 'video/mp4' : 'image/jpeg';
      const uploadTask = uploadBytesResumable(storageRef, blob, { contentType });
      const url = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => {
            if (onProgress && snap.totalBytes > 0) {
              onProgress(snap.bytesTransferred / snap.totalBytes);
            }
          },
          (err) => reject(err),
          async () => {
            try {
              const rawUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(rawUrl);
            } catch (err) {
              reject(err);
            }
          }
        );
      });
      return applyCdn(url);
    },
    [storage]
  );

  const handleAddClip = useCallback(async () => {
    if (isGuest) {
      requireAuth();
      return;
    }
    if (feed.length >= 30) {
      Alert.alert('Upload limit reached', 'You can upload up to 30 clips.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Enable photo/video library access to add a clip.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.5,
      videoMaxDuration: 30,
      allowsMultipleSelection: false,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    const uri = asset?.uri || '';
    const isVideo = asset?.type === 'video';
    let thumb = uri;
    let uploadSource = uri;

    if (isVideo && uri) {
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 500 });
        if (thumbUri) thumb = thumbUri;
      } catch (err) {
        console.warn('Video thumbnail failed', err);
      }
    } else if (uri) {
      try {
        const resized = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 720 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        uploadSource = resized.uri;
        thumb = resized.uri;
      } catch (err) {
        console.warn('Image resize failed', err);
      }
    }

    let uploadedUrl = uploadSource;
    let uploadedThumb = thumb;
    if (db && storage && uploadSource) {
      setUploading(true);
      setUploadProgress(0);
      try {
        const cloudUrl = await uploadToStorage(uploadSource, isVideo, setUploadProgress);
        if (cloudUrl) uploadedUrl = cloudUrl;
        if (thumb && thumb !== uploadSource) {
          uploadedThumb = await uploadToStorage(thumb, false, setUploadProgress);
        } else {
          uploadedThumb = uploadedUrl;
        }
      } catch (error) {
        console.warn('Upload failed, falling back locally', error?.message || error);
        Alert.alert(
          'Upload failed',
          'Could not upload to Firebase Storage. Check storage rules/bucket and try again.'
        );
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }

    if (db) {
      try {
        const payload = {
          title: 'New footy clip',
          club: '',
          description: 'Describe your moment...',
          mediaUrl: uploadedUrl,
          thumbnail: uploadedThumb || uploadedUrl,
          uploader: user,
          likes: 0,
          comments: 0,
          mediaType: isVideo ? 'video' : 'image',
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, 'feed'), payload);
        setFeed((prev) =>
          dedupeById([{ ...payload, id: docRef.id, commentsList: [], createdAt: Date.now() }, ...prev])
        );
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
        thumbnail: uploadedThumb || uploadedUrl,
        uploader: user,
        likes: 0,
        comments: 0,
        mediaType: isVideo ? 'video' : 'image',
      },
      ...prev,
    ].reduce((acc, item) => {
      if (!item?.id || acc.find((x) => x.id === item.id)) return acc;
      acc.push(item);
      return acc;
    }, []));
  }, [db, storage, uploadToStorage, feed.length, dedupeById, user, requireAuth, isGuest]);

  const renderItem = ({ item }) => {
    const isActive = item.id === activeId;
    const isLiked = liked[item.id];
    const likeCount = item.likes || 0;
    const progress = playbackProgress[item.id] || 0;
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
            shouldPlay={isActive && isFocused}
            isLooping
            isMuted={!isActive || !isFocused}
            useNativeControls={false}
            usePoster
            posterSource={item.thumbnail ? { uri: item.thumbnail } : undefined}
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded || !status.durationMillis) return;
              const pct = Math.min(1, Math.max(0, status.positionMillis / status.durationMillis));
              setPlaybackProgress((prev) => {
                if (prev[item.id] === pct) return prev;
                return { ...prev, [item.id]: pct };
              });
            }}
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
            <TouchableOpacity
              style={styles.uploaderRow}
              onPress={() => openProfilePreview(item.uploader)}
            >
              <View style={styles.uploaderAvatar}>
                <Text style={styles.uploaderAvatarText}>
                  {item.uploader?.slice(1, 2)?.toUpperCase() || 'F'}
                </Text>
              </View>
              <Text style={[styles.uploaderHandle, styles.overlayText]}>{item.uploader}</Text>
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
            <TouchableOpacity style={styles.actionButtonSurface} onPress={() => handleToggleLike(item)}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={28} color="#ffffff" />
              <Text style={styles.actionStackLabel}>{formatCount(likeCount)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonSurface}
              onPress={() => {
                if (isGuest) {
                  requireAuth();
                  return;
                }
                setCommentModal({ visible: true, item, text: '' });
                loadCommentsForItem(item);
              }}
            >
              <Ionicons name="chatbubble-ellipses" size={28} color="#ffffff" />
              <Text style={styles.actionStackLabel}>{formatCount(item.comments)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonSurface}
              onPress={async () => {
                if (isGuest) {
                  requireAuth();
                  return;
                }
                try {
                  await Share.share({ message: `${item.title} - ${item.mediaUrl || ''}` });
                } catch (err) {
                  console.warn('Share failed', err);
                }
              }}
            >
              <Ionicons name="share-social" size={26} color="#ffffff" />
              <Text style={styles.actionStackLabel}>Share</Text>
            </TouchableOpacity>
          </View>
          {item.mediaType === 'video' && isActive ? (
            <View style={styles.videoProgressBar}>
              <View style={[styles.videoProgressFill, { width: `${progress * 100}%` }]} />
            </View>
          ) : null}
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
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={4}
        removeClippedSubviews
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        disableIntervalMomentum
        snapToStart
        snapToEnd
        onEndReached={() => fetchPage(false)}
        onEndReachedThreshold={0.6}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={() =>
          loadingPage && hasMore ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator color={theme.secondary} />
            </View>
          ) : (
            <View style={{ height: 8 }} />
          )
        }
        getItemLayout={(_, index) => ({
          length: cardHeight,
          offset: cardHeight * index,
          index,
        })}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 12 }}
      />
      {uploading ? (
        <View style={styles.uploadProgressContainer}>
          <Text style={styles.uploadProgressLabel}>Uploading...</Text>
          <View style={styles.uploadProgressBar}>
            <View style={[styles.uploadProgressFill, { width: `${Math.round(uploadProgress * 100)}%` }]} />
          </View>
          <Text style={styles.uploadProgressPct}>{Math.round(uploadProgress * 100)}%</Text>
        </View>
      ) : null}
      <TouchableOpacity style={styles.fab} onPress={handleAddClip} activeOpacity={0.9}>
        <Ionicons name="add" size={28} color={theme.background} />
        <Text style={styles.fabText}>Add clip</Text>
      </TouchableOpacity>
      <Modal
        visible={profilePreview.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfilePreview({ visible: false, handle: null })}
      >
        <TouchableWithoutFeedback onPress={() => setProfilePreview({ visible: false, handle: null })}>
          <View style={styles.previewOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.previewContent, { backgroundColor: '#fff', padding: 16, borderRadius: 16 }]}>
                <Text style={[styles.panelTitle, { color: theme.text }]}>{profilePreview.handle}</Text>
                {!isGuest && profilePreview.handle !== user ? (
                  <TouchableOpacity style={styles.followButton} onPress={togglePreviewFollow}>
                    <Text style={styles.followButtonText}>{previewFollowing ? 'Unfollow' : 'Follow'}</Text>
                  </TouchableOpacity>
                ) : null}
                <ScrollView contentContainerStyle={{ gap: 10 }}>
                  {previewUploads.length === 0 ? (
                    <Text style={styles.muted}>No uploads yet.</Text>
                  ) : (
                    previewUploads.map((it) => (
                      <View key={it.id} style={styles.commentBubble}>
                        <Text style={styles.commentAuthor}>{it.title}</Text>
                        {it.mediaType === 'video' ? (
                          <Video source={{ uri: it.mediaUrl }} style={{ width: '100%', height: 200 }} useNativeControls />
                        ) : (
                          <Image source={{ uri: it.mediaUrl }} style={{ width: '100%', height: 200, borderRadius: 10 }} />
                        )}
                      </View>
                    ))
                  )}
                </ScrollView>
                <TouchableOpacity style={styles.previewClose} onPress={() => setProfilePreview({ visible: false, handle: null })}>
                  <Text style={styles.previewCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal visible={commentModal.visible} transparent animationType="slide">
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
            setCommentModal({ visible: false, item: null, text: '' });
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalCard}>
                <Text style={styles.panelTitle}>Comments</Text>
                <ScrollView style={styles.commentList} contentContainerStyle={{ gap: 8 }}>
                  {commentLoading ? (
                    <ActivityIndicator color={theme.secondary} />
                  ) : activeComments.length === 0 ? (
                    <Text style={styles.muted}>No comments yet.</Text>
                  ) : (
                    activeComments.map((c, idx) => (
                      <View key={idx} style={styles.commentBubble}>
                        <Text style={styles.commentAuthor} onPress={() => openProfilePreview(c.author)}>
                          {c.author || 'Anon'}
                        </Text>
                        <Text style={styles.commentText}>{c.text || ''}</Text>
                      </View>
                    ))
                  )}
                </ScrollView>
                <TextInput
                  style={styles.commentInput}
                  value={commentModal.text}
                  onChangeText={(text) => setCommentModal((prev) => ({ ...prev, text }))}
                  placeholder="Write a comment"
                  placeholderTextColor={theme.muted}
                  multiline
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setCommentModal({ visible: false, item: null, text: '' })}>
                    <Text style={styles.addBioText}>Close</Text>
                  </TouchableOpacity>
                <TouchableOpacity
                  style={styles.commentSendButton}
                  onPress={() => {
                    handleSubmitComment();
                    Keyboard.dismiss();
                  }}
                >
                  <Text style={styles.commentSendText}>Post</Text>
                </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const ForumScreen = () => {
  const { user, requireAuth } = useContext(AuthContext);
  const [activeTeam, setActiveTeam] = useState(null);
  const [forumComments, setForumComments] = useState({});
  const [commentText, setCommentText] = useState('');
  const detailScrollRef = useRef(null);
  const [commentImage, setCommentImage] = useState(null);
  const db = useMemo(() => getDb(), []);
  const storage = useMemo(() => getStorageInstance(), []);
  const navigation = useNavigation();
  const [previewState, setPreviewState] = useState({ visible: false, handle: null });
  const [previewUploads, setPreviewUploads] = useState([]);
  const [previewFollowing, setPreviewFollowing] = useState(false);
  const [previewFollowingList, setPreviewFollowingList] = useState([]);
  const [previewFollowersList, setPreviewFollowersList] = useState([]);

  const commentsForTeam = activeTeam ? forumComments[activeTeam.name] || [] : [];

  useEffect(() => {
    if (!activeTeam) return;
    // Nudge the scroll view right after mount so scrolling is available immediately
    const timer = setTimeout(() => {
      detailScrollRef.current?.scrollTo({ y: 1, animated: false });
      detailScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, [activeTeam, commentsForTeam.length]);

  const uploadForumImage = useCallback(
    async (uri) => {
      if (!storage || !uri) return uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const extGuess = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const storageRef = ref(storage, `forum-comments/${Date.now()}-${Math.floor(Math.random() * 10000)}.${extGuess}`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      return getDownloadURL(storageRef);
    },
    [storage]
  );

  const fetchForumComments = useCallback(
    async (team) => {
      if (!db || !team) return;
      const teamId = team.name.toLowerCase().replace(/\s+/g, '-');
      try {
        const snap = await getDoc(doc(db, 'forums', teamId));
        if (snap.exists()) {
          const data = snap.data();
          setForumComments((prev) => ({ ...prev, [team.name]: data.commentsList || [] }));
        }
      } catch (err) {
        console.warn('Fetch forum comments failed', err);
      }
    },
    [db]
  );

  const handleSendComment = useCallback(async () => {
    if (!user || user === '@guest') {
      requireAuth();
      return;
    }
    if (!activeTeam) return;
    const trimmed = commentText.trim();
    if (!trimmed && !commentImage) return;

    let imageUrl = '';
    if (commentImage) {
      try {
        imageUrl = await uploadForumImage(commentImage);
      } catch (err) {
        console.warn('Forum image upload failed', err);
      }
    }

    const newComment = {
      author: user || '@anon',
      text: trimmed,
      imageUrl,
      createdAt: Date.now(),
    };

    setForumComments((prev) => ({
      ...prev,
      [activeTeam.name]: [...(prev[activeTeam.name] || []), newComment],
    }));
    setCommentText('');
    setCommentImage(null);
    Keyboard.dismiss();

    if (db) {
      const teamId = activeTeam.name.toLowerCase().replace(/\s+/g, '-');
      try {
        await setDoc(
          doc(db, 'forums', teamId),
          { commentsList: arrayUnion(newComment) },
          { merge: true }
        );
      } catch (err) {
        console.warn('Persist forum comment failed', err);
      }
    }
  }, [activeTeam, commentText, commentImage, db, uploadForumImage, user, requireAuth]);

  const handleAttachImage = async () => {
    if (!user || user === '@guest') {
      requireAuth();
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Enable photo library access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) setCommentImage(uri);
  };

  const loadForumPreview = useCallback(
    (handle) => {
      if (!db || !handle) return undefined;
      const q = query(collection(db, 'feed'), where('uploader', '==', handle), orderBy('createdAt', 'desc'));
      return onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || 'Untitled',
              mediaUrl: data.mediaUrl || data.thumbnail || '',
              mediaType: data.mediaType || 'image',
            };
          });
          setPreviewUploads(list);
        },
        (err) => console.warn('Forum preview load failed', err)
      );
    },
    [db]
  );

  const watchPreviewFollow = useCallback(
    (handle) => {
      if (!db || !handle || !user || user === '@guest') {
        setPreviewFollowing(false);
        return () => {};
      }
      return onSnapshot(
        doc(db, 'follows', user),
        (snap) => {
          const following = snap.data()?.following || [];
          setPreviewFollowing(following.includes(handle));
        },
        (err) => console.warn('Forum preview follow check failed', err)
      );
    },
    [db, user]
  );

  const openProfilePreview = useCallback(
    (handle) => {
      setPreviewState({ visible: true, handle });
      loadForumPreview(handle);
      watchPreviewFollow(handle);
    },
    [loadForumPreview, watchPreviewFollow]
  );

  const togglePreviewFollow = useCallback(async () => {
    const handle = previewState.handle;
    if (!handle) return;
    if (!user || user === '@guest') {
      requireAuth();
      return;
    }
    if (!db) return;
    try {
      if (previewFollowing) {
        await setDoc(doc(db, 'follows', user), { following: arrayRemove(handle) }, { merge: true });
      } else {
        await setDoc(doc(db, 'follows', user), { following: arrayUnion(handle) }, { merge: true });
      }
    } catch (err) {
      console.warn('Forum preview follow toggle failed', err);
    }
  }, [db, previewFollowing, previewState.handle, requireAuth, user]);

  if (activeTeam) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: '#ffffff' }]}>
        <KeyboardAvoidingView
          style={styles.forumDetailContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight + 8 : 0}
        >
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.forumBackButton} onPress={() => setActiveTeam(null)}>
              <Ionicons name="arrow-back" size={22} color={theme.secondary} />
              <Text style={styles.forumBackText}>Back</Text>
            </TouchableOpacity>
            <ScrollView
              ref={detailScrollRef}
              style={styles.forumDetailScroll}
              contentContainerStyle={styles.forumDetailContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              overScrollMode="always"
              scrollEventThrottle={16}
              contentInsetAdjustmentBehavior="always"
              onScrollBeginDrag={Keyboard.dismiss}
            >
              <View style={styles.forumLogoContainerModal}>
                <Image source={activeTeam.logo} style={styles.forumLogoImageModal} resizeMode="contain" />
                <Text style={styles.forumTeamLabelModal}>{activeTeam.name}</Text>
              </View>
                {commentsForTeam.length === 0 ? (
                  <Text style={styles.muted}>No posts yet. Start the discussion.</Text>
                ) : (
                  commentsForTeam.map((c, idx) => (
                    <View key={`${activeTeam.name}-${idx}`} style={styles.commentBubble}>
                      <Text
                        style={styles.commentAuthor}
                        onPress={() => openProfilePreview(c.author)}
                      >
                        {c.author || '@anon'}
                      </Text>
                      {c.text ? <Text style={styles.commentText}>{c.text}</Text> : null}
                      {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={styles.commentImage} /> : null}
                    </View>
                  ))
                )}
            </ScrollView>
            <View style={styles.commentFormFixed}>
              <TextInput
                style={styles.commentInput}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a post..."
                placeholderTextColor={theme.muted}
                multiline
                returnKeyType="default"
                onSubmitEditing={handleSendComment}
                onFocus={() => {
                  setTimeout(() => detailScrollRef.current?.scrollToEnd({ animated: true }), 50);
                }}
                onBlur={Keyboard.dismiss}
              />
              {commentImage ? (
                <View style={styles.attachPreview}>
                  <Image source={{ uri: commentImage }} style={styles.attachPreviewImage} />
                  <TouchableOpacity onPress={() => setCommentImage(null)}>
                    <Text style={styles.commentAttachText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.commentActionsRow}>
                <TouchableOpacity style={styles.commentAttachButton} onPress={handleAttachImage}>
                  <Ionicons name="image-outline" size={18} color="#2563eb" />
                  <Text style={styles.commentAttachText}>Add image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.commentSendButton} onPress={handleSendComment}>
                  <Text style={styles.commentSendText}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
        <Modal
          visible={previewState.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewState({ visible: false, handle: null })}
        >
          <TouchableWithoutFeedback onPress={() => setPreviewState({ visible: false, handle: null })}>
            <View style={styles.previewOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.previewContent, { backgroundColor: '#fff', padding: 16, borderRadius: 16 }]}>
                  <Text style={[styles.panelTitle, { color: theme.text }]}>{previewState.handle}</Text>
                  {previewState.handle && previewState.handle !== user ? (
                    <TouchableOpacity style={styles.followButton} onPress={togglePreviewFollow}>
                      <Text style={styles.followButtonText}>{previewFollowing ? 'Unfollow' : 'Follow'}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <View style={styles.followListContainer}>
                    <View style={styles.followListRow}>
                      <Text style={styles.followListLabel}>Following</Text>
                      <Text style={styles.followListCount}>{previewFollowingList.length}</Text>
                    </View>
                    {previewFollowingList.slice(0, 6).map((h) => (
                      <Text key={`fv-fing-${h}`} style={styles.followListItem}>
                        {h}
                      </Text>
                    ))}
                    <View style={[styles.followListRow, { marginTop: 10 }]}>
                      <Text style={styles.followListLabel}>Followers</Text>
                      <Text style={styles.followListCount}>{previewFollowersList.length}</Text>
                    </View>
                    {previewFollowersList.slice(0, 6).map((h) => (
                      <Text key={`fv-ffer-${h}`} style={styles.followListItem}>
                        {h}
                      </Text>
                    ))}
                  </View>
                  <ScrollView contentContainerStyle={{ gap: 10 }}>
                    {previewUploads.length === 0 ? (
                      <Text style={styles.muted}>No uploads yet.</Text>
                    ) : (
                      previewUploads.map((it) => (
                        <View key={it.id} style={styles.commentBubble}>
                          <Text style={styles.commentAuthor}>{it.title}</Text>
                          {it.mediaType === 'video' ? (
                            <Video source={{ uri: it.mediaUrl }} style={{ width: '100%', height: 200 }} useNativeControls />
                          ) : (
                            <Image source={{ uri: it.mediaUrl }} style={{ width: '100%', height: 200, borderRadius: 10 }} />
                          )}
                        </View>
                      ))
                    )}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.previewClose}
                    onPress={() => setPreviewState({ visible: false, handle: null })}
                  >
                    <Text style={styles.previewCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={forumTeams}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.forumList}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.forumCard}
            onPress={() => {
              setActiveTeam(item);
              fetchForumComments(item);
            }}
          >
            <View style={styles.forumLogoContainer}>
              <Image source={item.logo} style={styles.forumLogoImage} resizeMode="contain" />
            </View>
            <Text style={styles.forumTeamLabel}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

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

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState('@guest');
  const [authVisible, setAuthVisible] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [storedAccount, setStoredAccount] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const db = useMemo(() => getDb(), []);

  const resetAuthFields = useCallback(() => {
    setAuthEmail('');
    setAuthPassword('');
    setAuthConfirm('');
  }, []);

  const completeAuth = useCallback(async () => {
    if (authLoading) return;
    if (!authEmail.trim()) {
      Alert.alert('Email required', 'Please enter your email.');
      return;
    }
    if (!authPassword.trim() || authPassword.trim().length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }
    if (authMode === 'signup' && authPassword.trim() !== authConfirm.trim()) {
      Alert.alert('Passwords do not match', 'Please re-enter matching passwords.');
      return;
    }

    const emailNorm = authEmail.trim().toLowerCase();
    const handle = `@${emailNorm.split('@')[0] || 'fan'}`;

    setAuthLoading(true);

    if (authMode === 'signup') {
      try {
        if (db) {
          const existing = await getDoc(doc(db, 'users', emailNorm));
          if (existing.exists()) {
            Alert.alert('Email in use', 'This email is already registered. Please log in instead.');
            setAuthLoading(false);
            return;
          }
        }
        if (db) {
          await setDoc(
            doc(db, 'users', emailNorm),
            {
              email: emailNorm,
              password: authPassword.trim(),
              handle,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
        setStoredAccount({ email: emailNorm, password: authPassword.trim(), handle });
        setUser(handle);
        setAuthVisible(false);
        resetAuthFields();
      } catch (err) {
        console.warn('Signup save failed', err);
        Alert.alert('Signup failed', 'Could not save user. Check connection and rules.');
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    if (authMode === 'login') {
      try {
        if (db) {
          const snap = await getDoc(doc(db, 'users', emailNorm));
          if (snap.exists()) {
            const data = snap.data();
            if (data.password === authPassword.trim()) {
              setUser(data.handle || handle);
              setAuthVisible(false);
              resetAuthFields();
              setAuthLoading(false);
              return;
            }
          }
        }
        // fallback to local
        const matchesEmail = storedAccount?.email === emailNorm;
        const matchesPass = storedAccount?.password === authPassword.trim();
        if (matchesEmail && matchesPass) {
          setUser(storedAccount.handle || handle);
          setAuthVisible(false);
          resetAuthFields();
        } else {
          Alert.alert('Login failed', 'Email or password is incorrect.');
        }
      } catch (err) {
        console.warn('Login failed', err);
        Alert.alert('Login failed', 'Check connection and try again.');
      } finally {
        setAuthLoading(false);
      }
    }
  }, [authConfirm, authEmail, authMode, authPassword, authLoading, db, resetAuthFields, storedAccount]);

  const login = useCallback(() => {
    setAuthMode('login');
    setAuthVisible(true);
  }, []);

  const signup = useCallback(() => {
    setAuthMode('signup');
    setAuthVisible(true);
  }, []);

  const logout = useCallback(() => {
    setUser('@guest');
    resetAuthFields();
  }, []);

  const requireAuth = useCallback(() => {
    setAuthMode('login');
    setAuthVisible(true);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, requireAuth }}>
      {children}
      <Modal visible={authVisible} transparent animationType="fade" onRequestClose={() => setAuthVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setAuthVisible(false)}>
          <View style={styles.authModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.authModalCard}>
                <Text style={styles.panelTitle}>{authMode === 'signup' ? 'Sign up' : 'Log in'}</Text>
                <Text style={styles.muted}>Enter your email and password.</Text>
                <TextInput
                  style={styles.authInput}
                  value={authEmail}
                  onChangeText={setAuthEmail}
                  placeholder="email"
                  placeholderTextColor={theme.muted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.authInput}
                  value={authPassword}
                  onChangeText={setAuthPassword}
                  placeholder="password"
                  placeholderTextColor={theme.muted}
                  secureTextEntry
                />
                {authMode === 'signup' ? (
                  <TextInput
                    style={styles.authInput}
                    value={authConfirm}
                    onChangeText={setAuthConfirm}
                    placeholder="confirm password"
                    placeholderTextColor={theme.muted}
                    secureTextEntry
                  />
                ) : null}
                <View style={styles.authModalActions}>
                  <TouchableOpacity disabled={authLoading} onPress={() => setAuthVisible(false)}>
                    <Text style={styles.addBioText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.authButton} onPress={completeAuth} disabled={authLoading}>
                    <Text style={styles.authButtonText}>
                      {authLoading ? 'Please wait...' : authMode === 'signup' ? 'Sign up' : 'Log in'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </AuthContext.Provider>
  );
};

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const tabOrder = ['Profile', 'Forum', 'Feed', 'Games'];
  const [activeTab, setActiveTab] = useState('Feed');
  const [dragX, setDragX] = useState(0);
  const animatedTransition = useRef(new Animated.Value(0)).current;

  const handleSwipe = useCallback(
    (dx, vx) => {
      const currentIndex = tabOrder.indexOf(activeTab);
      if (currentIndex === -1) return;
      if (dx < -40 && vx < -200 && currentIndex < tabOrder.length - 1) {
        Animated.sequence([
          Animated.timing(animatedTransition, { toValue: -20, duration: 100, useNativeDriver: true }),
          Animated.timing(animatedTransition, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
        navigationRef.current?.navigate(tabOrder[currentIndex + 1]);
      } else if (dx > 40 && vx > 200 && currentIndex > 0) {
        Animated.sequence([
          Animated.timing(animatedTransition, { toValue: 20, duration: 100, useNativeDriver: true }),
          Animated.timing(animatedTransition, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
        navigationRef.current?.navigate(tabOrder[currentIndex - 1]);
      }
    },
    [activeTab, navigationRef, tabOrder, animatedTransition]
  );

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-60, 60]) // allow shallow vertical drift
        .minDistance(20)
        .onUpdate(({ translationX }) => setDragX(translationX))
        .onEnd(({ translationX, velocityX }) => {
          setDragX(0);
          handleSwipe(translationX, velocityX);
        }),
    [handleSwipe]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <GestureDetector gesture={swipeGesture}>
            <Animated.View style={{ flex: 1, transform: [{ translateX: Animated.add(animatedTransition, new Animated.Value(dragX * 0.08)) }] }}>
              <NavigationContainer
                ref={navigationRef}
                theme={navTheme}
                onReady={() => setActiveTab('Feed')}
                onStateChange={() => {
                  const route = navigationRef.getCurrentRoute();
                  if (route?.name) setActiveTab(route.name);
                }}
              >
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
                  <Tab.Screen name="Forum" component={ForumScreen} />
                  <Tab.Screen name="Feed" component={FeedScreen} />
                  <Tab.Screen name="Games" component={GamesScreen} />
                </Tab.Navigator>
              </NavigationContainer>
            </Animated.View>
          </GestureDetector>
        </AuthProvider>
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
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: theme.secondary,
    padding: 6,
    borderRadius: 999,
  },
  uploadAvatarText: {
    color: theme.secondary,
    fontWeight: '700',
  },
  avatarText: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 24,
  },
  avatarPlaceholderText: {
    color: theme.secondary,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
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
  bio: {
    color: theme.muted,
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  bioInputWrapper: {
    width: '100%',
    marginTop: 10,
    gap: 8,
  },
  bioInput: {
    color: theme.text,
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    backgroundColor: '#eef2f7',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addBioButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eef2f7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addBioText: {
    color: theme.secondary,
    fontWeight: '700',
  },
  authRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  authButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.highlight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.highlight,
  },
  authButtonOutline: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  authButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecdd3',
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontWeight: '800',
  },
  authSubtle: {
    color: theme.muted,
    fontSize: 12,
  },
  authModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authModalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  authInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    color: theme.text,
  },
  authModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  uploadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  uploadCard: {
    width: '30%',
  },
  uploadImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#eef2f7',
    marginBottom: 6,
  },
  uploadTitle: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 13,
  },
  forumList: {
    padding: 16,
    gap: 16,
  },
  forumCard: {
    flexDirection: 'row',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 3,
  },
  forumLogoContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  forumLogoImage: {
    width: '80%',
    height: 150,
    resizeMode: 'contain',
  },
  forumTeamLabel: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 18,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginBottom: 60,
  },
  commentList: {
    gap: 8,
    maxHeight: 200,
  },
  commentBubble: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  commentSendButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  commentSendText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  commentAuthor: {
    color: theme.secondary,
    fontWeight: '700',
  },
  commentText: {
    color: theme.text,
    marginTop: 4,
  },
  commentForm: {
    marginTop: 12,
    gap: 8,
    marginBottom: 16,
  },
  commentFormFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    gap: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  commentActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    color: theme.text,
  },
  commentSendButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  commentSendText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  commentAttachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  commentAttachText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  attachPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachPreviewImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  commentImage: {
    marginTop: 6,
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewContent: {
    width: '100%',
    height: '80%',
    alignItems: 'center',
  },
  previewMedia: {
    width: '100%',
    height: '90%',
  },
  previewClose: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderRadius: 10,
  },
  previewCloseText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  forumDetailContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  forumDetailScroll: {
    flex: 1,
  },
  forumBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  forumBackText: {
    color: theme.secondary,
    fontWeight: '700',
  },
  forumDetailContent: {
    gap: 12,
    paddingBottom: 240,
    flexGrow: 1,
    minHeight: '100%',
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
    height: tabBarHeight + 8,
    paddingBottom: 12,
    paddingTop: 6,
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
  followRow: {
    marginTop: 8,
  },
  followButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.secondary,
  },
  followButtonText: {
    color: '#ffffff',
    fontWeight: '700',
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
    width: 80,
    alignItems: 'center',
    gap: 12,
    marginBottom: tabBarHeight + 6,
  },
  actionButtonSurface: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
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
  overlayText: {
    color: '#ffffff',
  },
  overlayMuted: {
    color: '#e5e7eb',
  },
  videoProgressBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  videoProgressFill: {
    height: '100%',
    backgroundColor: '#16a34a',
  },
  uploadProgressContainer: {
    position: 'absolute',
    bottom: tabBarHeight + 80,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 14,
    padding: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
  },
  uploadProgressLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  uploadProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#16a34a',
  },
  uploadProgressPct: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  followListContainer: {
    marginTop: 8,
    marginBottom: 8,
    gap: 4,
  },
  followListRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  followListLabel: {
    color: theme.text,
    fontWeight: '700',
  },
  followListCount: {
    color: theme.text,
    fontWeight: '700',
  },
  followListItem: {
    color: theme.muted,
    fontSize: 12,
  },
  followStatButton: {
    padding: 8,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    marginTop: 4,
    alignItems: 'center',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#eef2f7',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingsDropdown: {
    position: 'absolute',
    top: 40,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  settingsItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  settingsItemText: {
    color: theme.secondary,
    fontWeight: '700',
  },
  kickoffText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  forumList: {
    padding: 16,
    gap: 16,
  },
  forumCard: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 3,
  },
  forumLogoContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  forumLogoImage: {
    width: '80%',
    height: 150,
    resizeMode: 'contain',
  },
  forumTeamLabel: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 18,
    marginTop: 4,
  },
  forumLogoContainerModal: {
    alignItems: 'center',
    gap: 6,
  },
  forumLogoImageModal: {
    width: '60%',
    height: 140,
    resizeMode: 'contain',
  },
  forumTeamLabelModal: {
    color: theme.text,
    fontWeight: '800',
    fontSize: 20,
  },
});




