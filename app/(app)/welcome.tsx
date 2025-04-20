import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View, Platform } from "react-native";
import * as Notifications from 'expo-notifications';

import { Audio } from 'expo-av';

import { Image } from "@/components/image";
import { SafeAreaView } from "@/components/safe-area-view";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, H2, Muted } from "@/components/ui/typography";
import { AppleAuthButton } from "@/components/ui/apple-auth-button";
import { GoogleAuthButton } from "@/components/ui/google-auth-button";
import { useSupabase } from "@/context/supabase-provider";

type OnboardingStep = 'welcome' | 'permissions' | 'notifications' | 'auth' | 'complete' | 'trial';

export default function WelcomeScreen() {
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
	const [permissionsGranted, setPermissionsGranted] = useState(false);

	const requestPermissions = async () => {
		try {
			// Request microphone permission
			const audioPermission = await Audio.requestPermissionsAsync();
			
			// Request notification permission
			let notificationPermission = { granted: true };
			if (Platform.OS !== 'web') {
				notificationPermission = await Notifications.requestPermissionsAsync({
					ios: {
						allowAlert: true,
						allowBadge: true,
						allowSound: true,
					},
				});
			}

			const allGranted = audioPermission.granted && notificationPermission.granted;
			
			setPermissionsGranted(allGranted);
			if (allGranted) {
				setCurrentStep('auth');
			}
		} catch (error) {
			console.error('Error requesting permissions:', error);
		}
	};

	const renderStep = () => {
		switch (currentStep) {
			case 'welcome':
				return (
					<>
						<View className="flex flex-1 items-center justify-center gap-y-4">
							<Image
								source={require("@/assets/icon.png")}
								className="w-24 h-24 rounded-2xl mb-4"
							/>
							<H1 className="text-center">Welcome to Ghosted AI</H1>
							<Muted className="text-center px-6">
								Your AI-powered voice memo assistant that helps you stay organized and productive.
							</Muted>
						</View>
						<View className="p-4">
							<Button
								size="lg"
								variant="default"
								onPress={() => setCurrentStep('permissions')}
							>
								<Text className="text-lg">Get Started</Text>
							</Button>
						</View>
					</>
				);

			case 'permissions':
				return (
					<View className="flex-1 justify-between p-4">
						<View className="flex-1 items-center justify-center gap-y-6">
							<View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
								<Text className="text-4xl">🎤</Text>
							</View>
							<H2 className="text-center">Enable Voice Recording</H2>
							<Muted className="text-center px-6">
								Ghosted AI needs access to your microphone to record voice memos and notifications to keep you updated.
							</Muted>
						</View>
						<Button
							size="lg"
							variant="default"
							onPress={requestPermissions}
						>
							<Text className="text-lg">Continue</Text>
						</Button>
					</View>
				);

			case 'auth':
				return (
					<View className="flex-1 justify-between p-4">
						<View className="flex-1 items-center justify-center gap-y-6">
							<View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
								<Text className="text-4xl">🔐</Text>
							</View>
							<H2 className="text-center">Sign In to Continue</H2>
							<Muted className="text-center px-6">
								Choose your preferred way to sign in to Ghosted AI
							</Muted>
						</View>
						<View className="flex flex-col gap-y-4">
							{Platform.OS === 'ios' && <AppleAuthButton />}
							<GoogleAuthButton />
						</View>
					</View>
				);

			case 'complete':
				return (
					<View className="flex-1 justify-between p-4">
						<View className="flex-1 items-center justify-center gap-y-6">
							<View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
								<Text className="text-4xl">🎉</Text>
							</View>
							<H2 className="text-center">You're All Set!</H2>
							<Muted className="text-center px-6">
								Get ready to experience the future of voice memos with Ghosted AI
							</Muted>
						</View>
						<Button
							size="lg"
							variant="default"
							onPress={() => setCurrentStep('trial')}
						>
							<Text className="text-lg">Start Ghosted AI</Text>
						</Button>
					</View>
				);

			case 'trial':
				return (
					<View className="flex-1 justify-between p-4">
						<View className="flex-1 items-center justify-center gap-y-6">
							<View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
								<Text className="text-4xl">⭐️</Text>
							</View>
							<H2 className="text-center">Start Your Free Trial</H2>
							<Muted className="text-center px-6">
								Try Ghosted AI free for 7 days. No credit card required.
							</Muted>
							<View className="w-full p-4 bg-card rounded-xl">
								<Text className="text-lg font-medium mb-2">What's included:</Text>
								<View className="gap-y-2">
									<Text>✓ Unlimited voice memos</Text>
									<Text>✓ AI-powered transcription</Text>
									<Text>✓ Smart organization</Text>
									<Text>✓ Priority support</Text>
								</View>
							</View>
						</View>
						<Button
							size="lg"
							variant="default"
							onPress={() => router.push("/(app)/(protected)")}
						>
							<Text className="text-lg">Start Free Trial</Text>
						</Button>
					</View>
				);
		}
	};

	return (
		<SafeAreaView className="flex flex-1 bg-background">
			{renderStep()}
		</SafeAreaView>
	);
}
