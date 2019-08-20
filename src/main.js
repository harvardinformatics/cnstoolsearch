import Vue from 'vue'
import Vuetify from 'vuetify/lib'
import App from './App.vue'
import vuetify from './plugins/vuetify';

Vue.config.productionTip = false

Vue.use(Vuetify, {
    theme: {
      primary: '#7E0E1B',
      primaryHighlight: '#B21D2E',
      secondary: '#30B2A3',
      terciary: '#E8C878'
  }
})

new Vue({
  vuetify,
  render: h => h(App)
}).$mount('#app')
