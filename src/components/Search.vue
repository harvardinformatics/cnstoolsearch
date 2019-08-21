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
    </v-sheet>
    <v-card-text>
      <v-treeview 
        :items="items" 
        :search="search" 
        :filter="filter" 
        :open.sync="open"
        open-on-click
        dense
        >
        <template v-slot:append="{ item }">
            <a class="tool-link" v-if="item.isTool" :href="item.link" target="_blank"></a>
        </template>
      </v-treeview>
    </v-card-text>
  </v-card>
</template>

<script>
import _ from 'lodash';
import { format } from 'path';

export default {
	data: () => ({
        items: [],
        filteredOpen: [],
		open: [],
		search: null,
		caseSensitive: false
  	}),
  	methods: {
        activate() {
            alert("hello there!")
        },
	  	async generateItems() {
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
            
            for (let i = 1; i <= toolPageNumber; i++) {
                queries.push(`https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/tool?per_page=100&page=${i}`)
            }
            
            let toolsArray = await Promise.all(queries.map(url => fetch(url)
                .then(response => response.json())
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
        }
  	},
  	computed: {
    	filter() {
      		return (item, search, textKey) => {
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
    },
    beforeMount: function() {
        this.generateItems().then(items => this.items = items)
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
</style>