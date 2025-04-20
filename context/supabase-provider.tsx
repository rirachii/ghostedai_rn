import { Session, User } from "@supabase/supabase-js";
import { useRouter, useSegments, SplashScreen } from "expo-router";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

import { supabase } from "@/config/supabase";

SplashScreen.preventAutoHideAsync();

type SupabaseContextProps = {
	user: User | null;
	session: Session | null;
	initialized?: boolean;
	signUp: (email: string, password: string) => Promise<void>;
	signInWithPassword: (email: string, password: string) => Promise<void>;
	signInWithApple: () => Promise<void>;
	signInWithGoogle: () => Promise<void>;
	signOut: () => Promise<void>;
	onLayoutRootView: () => Promise<void>;
};

type SupabaseProviderProps = {
	children: React.ReactNode;
};

export const SupabaseContext = createContext<SupabaseContextProps>({
	user: null,
	session: null,
	initialized: false,
	signUp: async () => { },
	signInWithPassword: async () => { },
	signInWithApple: async () => { },
	signInWithGoogle: async () => { },
	signOut: async () => { },
	onLayoutRootView: async () => { },
});

export const useSupabase = () => useContext(SupabaseContext);

// Configure WebBrowser for Google Auth
WebBrowser.maybeCompleteAuthSession();

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
	const router = useRouter();
	const segments = useSegments();
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [initialized, setInitialized] = useState<boolean>(false);
	const [appIsReady, setAppIsReady] = useState<boolean>(false);
	
	// Set up Google OAuth
	const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
		clientId: '901877301098-0gcu5jrd7ru81qdm7odv1av4bsvb5uf0.apps.googleusercontent.com', // Replace with your actual Google client ID
		redirectUri: makeRedirectUri({
			scheme: 'ghosted',
		}),
		scopes: ['profile', 'email'],
	});

	const signUp = async (email: string, password: string) => {
		const { error } = await supabase.auth.signUp({
			email,
			password,
		});
		if (error) {
			throw error;
		}
	};

	const signInWithPassword = async (email: string, password: string) => {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) {
			throw error;
		}
	};

	const signInWithApple = async (): Promise<void> => {
		try {
			const credential = await AppleAuthentication.signInAsync({
				requestedScopes: [
					AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
					AppleAuthentication.AppleAuthenticationScope.EMAIL,
				],
			});

			if (credential.identityToken) {
				const { error } = await supabase.auth.signInWithIdToken({
					provider: 'apple',
					token: credential.identityToken,
				});

				if (error) throw error;
			} else {
				throw new Error('No identity token provided');
			}
		} catch (error: unknown) {
			if (error instanceof Error && error.name === 'ERR_REQUEST_CANCELED') {
				// Handle user cancellation
				console.log('User cancelled Apple Sign In');
				return;
			}
			console.error('Apple sign in error:', error);
			throw error;
		}
	};

	// Handle Google authentication response
	useEffect(() => {
		if (response?.type === 'success') {
			const { id_token } = response.params;
			
			const handleGoogleToken = async () => {
				try {
					const { error } = await supabase.auth.signInWithIdToken({
						provider: 'google',
						token: id_token,
					});
					
					if (error) throw error;
				} catch (error) {
					console.error('Error signing in with Google token:', error);
				}
			};
			
			handleGoogleToken();
		}
	}, [response]);

	const signInWithGoogle = async (): Promise<void> => {
		try {
			// Ensure request is ready
			if (!request) {
				throw new Error('Google authentication request not ready');
			}
			
			// Prompt the user to log in with Google
			const result = await promptAsync();
			
			if (result.type !== 'success') {
				// User cancelled or auth failed at the Google prompt level
				console.log('Google sign in cancelled or failed:', result);
				throw new Error('Google sign-in was cancelled or failed');
			}
			
			// The actual token handling happens in the useEffect above
		} catch (error) {
			console.error('Error signing in with Google:', error);
			throw error;
		}
	};

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			throw error;
		}
	};

	useEffect(() => {
		async function prepare() {
			try {
				const { data: { session } } = await supabase.auth.getSession();
				setSession(session);
				setUser(session ? session.user : null);
				setInitialized(true);

				const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
					setSession(session);
					setUser(session ? session.user : null);
				});

				await new Promise(resolve => setTimeout(resolve, 100));
			} catch (e) {
				console.warn(e);
			} finally {
				setAppIsReady(true);
			}
		}

		prepare();
	}, []);

	useEffect(() => {
		if (!initialized || !appIsReady) return;

		const inProtectedGroup = segments[1] === "(protected)";

		if (session && !inProtectedGroup) {
			router.replace("/(app)/(protected)");
		} else if (!session) {
			router.replace("/(app)/welcome");
		}
	}, [initialized, appIsReady, session]);

	const onLayoutRootView = useCallback(async () => {
		if (appIsReady) {
			await SplashScreen.hideAsync();
		}
	}, [appIsReady]);

	if (!initialized || !appIsReady) {
		return null;
	}

	return (
		<SupabaseContext.Provider
			value={{
				user,
				session,
				initialized,
				signUp,
				signInWithPassword,
				signInWithApple,
				signInWithGoogle,
				signOut,
				onLayoutRootView,
			}}
		>
			{children}
		</SupabaseContext.Provider>
	);
};
