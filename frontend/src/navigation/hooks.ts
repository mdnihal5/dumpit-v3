import { useNavigation as useNativeNavigation, ParamListBase } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useRoute as useNativeRoute } from '@react-navigation/core';
import { MainStackParamList, BottomTabParamList } from './types';

// Define a route type since we can't directly import it
type RouteType = {
  key: string;
  name: string;
  params?: Record<string, any>;
};

// Custom typed hooks for different navigator types
export function useNavigation<T extends keyof MainStackParamList>() {
  return useNativeNavigation<NativeStackNavigationProp<MainStackParamList, T>>();
}

export function useTabNavigation<T extends keyof BottomTabParamList>() {
  return useNativeNavigation<BottomTabNavigationProp<BottomTabParamList, T>>();
}

// Type safe useRoute hook for MainStack
export function useRoute<T extends keyof MainStackParamList>() {
  const route = useNativeRoute<any>();
  return {
    key: route.key,
    name: route.name as T,
    params: route.params as MainStackParamList[T]
  };
}

// Type safe useRoute hook for BottomTabs
export function useTabRoute<T extends keyof BottomTabParamList>() {
  const route = useNativeRoute<any>();
  return {
    key: route.key,
    name: route.name as T,
    params: route.params as BottomTabParamList[T]
  };
}

// Utility functions for getting navigation params
export function getRouteParams<T extends keyof MainStackParamList>(
  routeName: T, 
  navigation: NativeStackNavigationProp<MainStackParamList>
) {
  const route = navigation.getState().routes.find((r: RouteType) => r.name === routeName);
  return route?.params as MainStackParamList[T];
} 