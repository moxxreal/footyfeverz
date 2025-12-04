import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { NavigationContainer, DefaultTheme, useFocusEffect } from '@react-navigation/native';
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
  updateDoc,
  arrayUnion,
  doc,
  increment,
  where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

const Tab = createBottomTabNavigator();
const { height: screenHeight } = Dimensions.get('window');
const tabBarHeight = 66;
const cardHeight = Math.round(screenHeight - tabBarHeight);
const currentUser = '@you'; // replace with real handle when auth is added

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

const ProfileScreen = () => {
  const [uploads, setUploads] = useState(fallbackUploads);
  const [avatarUri, setAvatarUri] = useState(null);
  const [bio, setBio] = useState('');
  const [showBioInput, setShowBioInput] = useState(false);
  const [preview, setPreview] = useState({ visible: false, item: null });
  const db = useMemo(() => getDb(), []);

  useEffect(() => {
    if (!db) return undefined;
    const q = query(collection(db, 'feed'), where('uploader', '==', '@you'), orderBy('createdAt', 'desc'));
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
        if (list.length) setUploads(list);
      },
      (err) => console.warn('Profile uploads failed', err)
    );
  }, [db]);

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

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
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
          <Text style={styles.title}>Footy Fever</Text>
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
  const [feed, setFeed] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [liked, setLiked] = useState({});
  const [commentModal, setCommentModal] = useState({ visible: false, item: null, text: '' });
  const db = useMemo(() => getDb(), []);
  const storage = useMemo(() => getStorageInstance(), []);
  const videoRefs = useRef({});
  const [activeId, setActiveId] = useState(null);
  const [isFocused, setIsFocused] = useState(true);
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
            commentsList: data.commentsList || [],
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
    if (!commentModal.item || !commentModal.text.trim()) {
      setCommentModal({ visible: false, item: null, text: '' });
      return;
    }
    const newComment = { author: currentUser || '@anon', text: commentModal.text.trim(), createdAt: Date.now() };
    setFeed((prev) =>
      prev.map((it) =>
        it.id === commentModal.item.id
          ? {
              ...it,
              comments: (it.comments || 0) + 1,
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
  }, [commentModal, db]);

  const handleToggleLike = useCallback(
    async (item) => {
      const wasLiked = !!liked[item.id];
      const delta = wasLiked ? -1 : 1;
      setLiked((prev) => ({ ...prev, [item.id]: !wasLiked }));
      setFeed((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, likes: Math.max(0, (it.likes || 0) + delta) } : it
        )
      );
      if (db) {
        try {
          await updateDoc(doc(db, 'feed', item.id), { likes: increment(delta) });
        } catch (err) {
          console.warn('Persist like failed', err);
        }
      }
    },
    [db, liked]
  );

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
    if (feed.length >= 30) {
      Alert.alert('Upload limit reached', 'You can upload up to 30 clips.');
      return;
    }
    if (!currentUser || currentUser === '@guest') {
      Alert.alert('Sign in required', 'You need to be signed in to upload.');
      return;
    }
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
          uploader: currentUser,
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
        uploader: currentUser,
        likes: 0,
        comments: 0,
        mediaType: isVideo ? 'video' : 'image',
      },
      ...prev,
    ]);
  }, [db, storage, uploadToStorage]);

  const renderItem = ({ item }) => {
    const isActive = item.id === activeId;
    const isLiked = liked[item.id];
    const likeCount = item.likes || 0;
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
            <TouchableOpacity style={styles.actionStack} onPress={() => handleToggleLike(item)}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={32} color="#ffffff" />
              <Text style={styles.actionStackLabel}>{formatCount(likeCount)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionStack}
              onPress={() => setCommentModal({ visible: true, item, text: '' })}
            >
              <Ionicons name="chatbubble-ellipses" size={32} color="#ffffff" />
              <Text style={styles.actionStackLabel}>{formatCount(item.comments)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionStack}
              onPress={async () => {
                try {
                  await Share.share({ message: `${item.title} - ${item.mediaUrl || ''}` });
                } catch (err) {
                  console.warn('Share failed', err);
                }
              }}
            >
              <Ionicons name="share-social" size={30} color="#ffffff" />
              <Text style={styles.actionStackLabel}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionStack}
              onPress={() => Alert.alert('Saved', 'Download coming soon.')}
            >
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
                  {(commentModal.item?.commentsList || []).length === 0 ? (
                    <Text style={styles.muted}>No comments yet.</Text>
                  ) : (
                    commentModal.item.commentsList.map((c, idx) => (
                      <View key={idx} style={styles.commentBubble}>
                        <Text style={styles.commentAuthor}>{c.author || 'Anon'}</Text>
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
  const [activeTeam, setActiveTeam] = useState(null);
  const [forumComments, setForumComments] = useState({});
  const [commentText, setCommentText] = useState('');
  const detailScrollRef = useRef(null);
  const [commentImage, setCommentImage] = useState(null);

  const commentsForTeam = activeTeam ? forumComments[activeTeam.name] || [] : [];

  const handleSendComment = () => {
    if (!activeTeam || !commentText.trim()) return;
    const newComment = {
      author: currentUser || '@anon',
      text: commentText.trim(),
      imageUrl: commentImage || '',
      createdAt: Date.now(),
    };
    setForumComments((prev) => ({
      ...prev,
      [activeTeam.name]: [...(prev[activeTeam.name] || []), newComment],
    }));
    setCommentText('');
    setCommentImage(null);
    Keyboard.dismiss();
  };

  const handleAttachImage = async () => {
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

  if (activeTeam) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: '#ffffff' }]}>
        <KeyboardAvoidingView
          style={styles.forumDetailContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                scrollEnabled
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
                      <Text style={styles.commentAuthor}>{c.author || '@anon'}</Text>
                      <Text style={styles.commentText}>{c.text}</Text>
                      {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={styles.commentImage} /> : null}
                    </View>
                  ))
                )}
                <View style={{ height: 12 }} />
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
                  <TouchableOpacity
                    style={styles.commentAttachButton}
                    onPress={handleAttachImage}
                  >
                    <Ionicons name="image-outline" size={18} color="#2563eb" />
                    <Text style={styles.commentAttachText}>Add image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.commentSendButton} onPress={handleSendComment}>
                    <Text style={styles.commentSendText}>Post</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
          <TouchableOpacity activeOpacity={0.9} style={styles.forumCard} onPress={() => setActiveTeam(item)}>
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

export default function App() {
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
            <Tab.Screen name="Forum" component={ForumScreen} />
            <Tab.Screen name="Feed" component={FeedScreen} />
            <Tab.Screen name="Games" component={GamesScreen} />
          </Tab.Navigator>
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
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
    backgroundColor: '#ffffff',
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
    paddingBottom: 160,
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




