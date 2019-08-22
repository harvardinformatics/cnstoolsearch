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
        >
        <template v-slot:prepend="{ item }">
            <h3 v-if="item.isTool">-</h3>
        </template>
        <template v-slot:append="{ item }">
            <a class="tool-link" v-if="item.isTool" :href="item.link" target="_blank"></a>
            <img v-if="item.thumbnail" class="thumbnail" :src="item.thumbnail" alt="">
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
            // Get all tools
            const tools = await this.getAndFormatTools()
            // Get all parents (including parents and grandparents)
            const categories = await this.getAndFormatCategories(tools)

            // Add grandparent categories to items
            categories.forEach(cat => {
                if (cat.parent == 0) {
                    items.push(cat)
                }
            })

            // Add parent categories to grandparents in items
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
            
            // Add each url to a queries array
            for (let i = 1; i <= toolPageNumber; i++) {
                queries.push(`https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/tool?per_page=100&page=${i}`)
            }
            
            // Get an array of arrays of tools
            let toolsArray = await Promise.all(queries.map(url => fetch(url)
                .then(response => response.json())
                .catch(err => console.error(err))
            ))

            // Flatten all tools arrays into a single array
            let allTools = toolsArray.flat()

            // Determine how many media pages there are
            const thumbnailPageNumber = await fetch('https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/media?per_page=1')
                .then(response => response.headers.get('X-WP-Total'))
                .then(data => Math.ceil(data / 100))
                .catch(err => console.error(err))
            
            // Add each url to a queries array
            for (let i = 1; i <= thumbnailPageNumber; i++) {
                queries.push(`https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/media?per_page=100&page=${i}`)
            }
            
            // Get an array of arrays of tool media objects
            let thumbnailsArray = await Promise.all(queries.map(url => fetch(url)
                .then(response => response.json())
                .catch(err => console.error(err))
            ))

            // Flatten all media arrays into a single array
            let allThumbnails = thumbnailsArray.flat()

            // Loop through tools array and generate new minimal tool objets
            await allTools.forEach(tool => {
                let formTool = Object.create({})
                formTool.id = tool.id
                formTool.categories = tool.categories
                formTool.link = tool.link
                // Get thumbnail for this tool from thumbnails array
                formTool.thumbnail = this.getToolThumbnail(allThumbnails, tool.id)
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
            
            // Get all categories
            const categories = await fetch('https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/categories?per_page=100')
                .then(response => response.json()) 
                .catch(err => console.error(err))

            // Loop through categories array and generate new minimal category objects
            await categories.forEach(cat => {
                if (["admin", "news", "uncategorized", "research"].includes(cat.slug)) return
                let formCat = Object.create({})
                // Get children of this category
                formCat.children = this.getChildrenOfCategory(tools, cat)
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
            // If category is not a grandparent
            if (cat.parent != 0)
            // Check if tool belongs to the category
                tools.forEach(tool => {
                    if (tool.categories.includes(cat.id)) {
                        tool.parent = cat.id
                        tool.grandparent = cat.parent
                        childrenOfCategory.push(tool)
                    }
                })
            return childrenOfCategory
        },
        getToolThumbnail(thumbnails, id) {
            let url;
            thumbnails.forEach(thumb => {
                if (thumb.post == id && _.has(thumb, 'media_details.sizes.thumbnail.source_url')) {
                    const thumbnail = thumb['media_details']['sizes']['thumbnail']['source_url']
                    url = thumbnail
                    return
                }
            })
            return url
        },
        removeDups(value, index, self) { 
            return self.indexOf(value) === index;
        },

        // Finalize loading process
        loadItems(items) {
            this.items = items
            this.loading = false
        }
  	},
  	computed: {
        // Custom filter function
    	filter() {
      		return (item, search, textKey) => {
                    // If it's not a tool, it shouldn't be a part of the search
                    if (!item.isTool) return
                    // Make item info lowercase and remove spaces
                    let name = item[textKey].toLowerCase().replace(/\s/g, '');
                    // Check if search is in name
                    let result = name.indexOf(search.toLowerCase()) > -1
                    if (result && item.parent && item.grandparent) {
                        // If found, add item parents to filteredopen, which will trigger the open functionality
                        this.filteredOpen.push(item.parent)
                        this.filteredOpen.push(item.grandparent)
                    }
                    return result
                }
    		}
    },
    watch: {
        filteredOpen: function () {
            // As filteredOpen changes, this will update existing open array
            // Existing open array cannot be mutated directly due to Vue reactivity issues
            this.open = this.filteredOpen.filter(this.removeDups)
        },
        // If the search box is made empty, close all items
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

    .thumbnail {
        width: 40px;
        height: 40px;
        border-radius: 5px;
    }

</style>