import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import WorkoutApp from './WorkoutApp';

const App: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <WorkoutApp />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default App;