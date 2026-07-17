import Vue from 'vue'
import App from './App.vue'

import ChannelModelKit from 'channel-model-kit'
import 'channel-model-kit/style.css'

Vue.use(ChannelModelKit, {
  endpoints: {
    ttc: { post: '/ttc', latest: '/ttc-latest' },
    coordination: { post: '/coordination', latest: '/coordination-latest' },
    adhoc: { post: '/adhoc', latest: '/adhoc-latest' },
    vhf: { post: '/vhf', latest: '/vhf-latest' },
    uhf: { post: '/uhf', latest: '/uhf-latest' },
    fiveG: { post: '/5g', latest: '/5g-latest' },
    dss: { post: '/dsss', latest: '/dsss-latest' },
    fhss: { post: '/fhss', latest: '/fhss-latest' },
    gfsk: { post: '/gfsk', latest: '/gfsk-latest' },
    custom: { post: '/choose', latest: '/choose-latest' }
  }
})

new Vue({
  render: h => h(App)
}).$mount('#app')