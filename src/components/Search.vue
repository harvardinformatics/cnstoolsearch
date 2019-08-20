<template>
  <v-card class="mx-auto" max-width="1000">
    <v-sheet class="pa-4 primary">
      <v-text-field
        v-model="search"
        label="Search All CNS Tools"
        flat
        solo-inverted
        hide-details
        clearable
        clear-icon="mdi-close-circle-outline"
      ></v-text-field>
      <v-checkbox v-model="caseSensitive" dark hide-details label="Case sensitive search"></v-checkbox>
    </v-sheet>
    <v-card-text>
      <v-treeview :items="items" :search="search" :filter="filter" :open.sync="open">
        <template v-slot:prepend="{ item }">
          <v-icon
            v-if="item.children"
            v-text="`mdi-${item.id === 1 ? 'home-variant' : 'folder-network'}`"
          ></v-icon>
        </template>
      </v-treeview>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
	data: () => ({
		allData: [],
		categories: [],	
		tools: [],
		items: [],
		open: [1, 2],
		search: null,
		caseSensitive: false
  	}),
  	methods: {
	  	async getAndFormatData() {
            await this.getCategories()
            await this.getToolPageNumber().then(toolPageNumber => this.getTools(toolPageNumber))
            await this.addSuperCategories()
            await this.addToolsToSubCategories()
            await this.addSubCategories()
            console.log(this.items)
        },
        addSuperCategories() {
            this.categories.forEach(cat => {
                if (["admin", "news", "research", "uncategorized"].includes(cat.slug)) return;
                if (cat.parent == 0) {
                    cat['children'] = []
                    this.items.push(cat)
                }
            })
        },
        addToolsToSubCategories() {
            this.tools.forEach(tool => {
                this.categories.forEach(cat => {
                    if (tool.parent == cat.id) {
                        cat['children'] = []
                        cat['children'].push(tool)
                    }
                })
            })
        },
        addSubCategories() {
            this.items.forEach(item => {
                this.categories.forEach(cat => {
                    if (cat.parent == item.id) {
                        item['children'].push(cat)
                    }
                })
            })
        },
		getCategories() {
            fetch('https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/categories?per_page=50')
                .then(response => response.json())
                .then(categories => this.categories = categories)
        },
        getToolPageNumber() {
            return fetch('https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/tool?per_page=1')
                .then(response => response.headers.get('X-WP-Total'))
                .then(data => Math.ceil(data / 100))
        },
        async getTools(toolPageNumber) {
            let queries = []
            for (let i = 1; i <= toolPageNumber; i++) {
                queries.push(`https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/tool?per_page=100&page=${i}`)
            }
            await Promise.all(queries.map(url => fetch(url)
                .then(response => response.json())
                .then(tools => tools.forEach(t => this.tools.push(tools)))
            ))
        }
  	},
  	computed: {
    	filter() {
      		return this.caseSensitive
				? (item, search, textKey) => item[textKey].indexOf(search) > -1
				: undefined;
    		}
  	},
  	mounted: function() {
        this.getAndFormatData()
  	}
};
</script>

<style>
</style>