import Vue from 'vue'
import Vuetify from 'vuetify/lib'
import App from './App.vue'
import vuetify from './plugins/vuetify';

Vue.config.productionTip = false

Vue.use(Vuetify)

new Vue({
    vuetify,
    render: h => h(App)
}).$mount('#app')
