<template>
  <v-card class="mx-auto square" max-width="1000" flat>
    <v-flex class="header">CNS Tool Search</v-flex>
    <v-sheet class="pa-4 square" color='#EFEFEF'>
      <v-text-field
        v-model="search"
        label="Start typing the name of the tool you're looking for..."
        flat
        solo-inverted
        hide-details
        clearable
        clear-icon="mdi-close-circle-outline"
        background-color="white"
        color="black"
      ></v-text-field>
    </v-sheet>
        <v-progress-linear 
            color="#31B2A3"
            :active="loading"
            :indeterminate="loading"
            bottom 
        ></v-progress-linear>
    <v-card-text v-if="!loading">
      <v-treeview 
        :items="items" 
        :search="search" 
        :filter="filter"
        :open.sync="open"
        open-on-click
        dense
        >
        <template v-slot:prepend="{ item }">
            <h3 v-if="item.isTool">-</h3>
        </template>
        <template v-slot:append="{ item }">
            <a class="tool-link" v-if="item.isTool" :href="item.link" target="_blank"></a>
        </template>
      </v-treeview>
    </v-card-text>
  </v-card>
</template>

<script>
import _ from 'lodash';

export default {
	data: () => ({
        items: [],
        filteredOpen: [],
		open: [],
        search: null,
        loading: false
  	}),
  	methods: {
	  	async generateItems() {
            this.loading = true
            let items = []
            const tools = await this.getAndFormatTools()
            const categories = await this.getAndFormatCategories(tools)

            categories.forEach(cat => {
                if (cat.parent == 0) {
                    items.push(cat)
                }
            })

            items.forEach(item => {
                categories.forEach(cat => {
                    if (item.id == cat.parent) {
                        item.children.push(cat)
                    }
                })
            })

            return items
            
        },
        async getAndFormatTools() {
            let queries = [];
            let formattedTools = []

            // Determine how many tools pages there are
            const toolPageNumber = await fetch('https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/tool?per_page=1')
                .then(response => response.headers.get('X-WP-Total'))
                .then(data => Math.ceil(data / 100))
                .catch(err => console.error(err))
            
            for (let i = 1; i <= toolPageNumber; i++) {
                queries.push(`https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/tool?per_page=100&page=${i}`)
            }
            
            let toolsArray = await Promise.all(queries.map(url => fetch(url)
                .then(response => response.json())
                .catch(err => console.error(err))
            ))

            let allTools = toolsArray.flat()

            await allTools.forEach(tool => {
                let formTool = Object.create({})
                formTool.id = tool.id
                formTool.categories = tool.categories
                formTool.link = tool.link
                formTool.name = tool.title.rendered
                formTool.slug = tool.slug
                formTool.tags = tool.tags
                formTool.isTool = true
                formattedTools.push(formTool)
            })

            return await formattedTools
        },

        async getAndFormatCategories(tools) {
            let formattedCategories = []
            const categories = await fetch('https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/categories?per_page=100')
                .then(response => response.json()) 
                .catch(err => console.error(err))

            await categories.forEach(cat => {
                if (["admin", "news", "uncategorized", "research"].includes(cat.slug)) return
                let formCat = Object.create({})
                formCat['children'] = this.getChildrenOfCategory(tools, cat)
                formCat.id = cat.id
                formCat.link = cat.link
                formCat.parent = cat.parent
                formCat.name = cat.name
                formCat.slug = cat.slug
                formCat.isTool = false
                formattedCategories.push(formCat)
            })
            return formattedCategories
        },

        getChildrenOfCategory(tools, cat) {
            let childrenOfCategory = []
            if (cat.parent != 0)
                tools.forEach(tool => {
                    if (tool.categories.includes(cat.id)) {
                        tool.parent = cat.id
                        tool.grandparent = cat.parent
                        childrenOfCategory.push(tool)
                    }
                })
            return childrenOfCategory
        },
        removeDups(value, index, self) { 
            return self.indexOf(value) === index;
        },
        loadItems(items) {
            this.items = items
            this.loading = false
        }
  	},
  	computed: {
    	filter() {
      		return (item, search, textKey) => {
                    if (item.parent == 0) return
                    let name = item[textKey].toLowerCase().replace(/\s/g, '');
                    let result = name.indexOf(search.toLowerCase()) > -1
                    if (result && item.parent && item.grandparent) {
                        this.filteredOpen.push(item.parent)
                        this.filteredOpen.push(item.grandparent)
                    }
                    return result
                }
    		}
    },
    watch: {
        filteredOpen: function () {
            this.open = this.filteredOpen.filter(this.removeDups)
        },
        search: function (newSearch, oldSearch) {
            if (newSearch == "" || newSearch == null) {
                this.open = []
            }
        }
    },
    beforeMount: function() {
        this.generateItems().then(items => this.loadItems(items))
    }
}
</script>

<style>
    .tool-link {
        width: 100%;
        height: 100%;
        position: absolute;
        z-index: 100;
    }
    .header {
        background-color: #31B2A3;
        text-align: center;
        color: white;
        height: 40px;
        line-height: 40px;
    }
    .square {
        border-radius: 0px;
    }

    input {
        color: black !important;
    }

</style>