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
          <!-- <v-icon
            v-if="item.children"
            v-text="`mdi-${item.id === 1 ? 'home-variant' : 'folder-network'}`"
          ></v-icon> -->
        </template>
      </v-treeview>
    </v-card-text>
  </v-card>
</template>

<script>
import _ from 'lodash';

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
            // await this.getCategories()
            this.getAndFormatTools()
                .then(toolsDict => this.getAndFormatCategories(toolsDict))
                .then(categoriesDict => this.generateItems(categoriesDict))
                .then(items => this.items = items)

                // .then(toolsArray => this.formatTools(toolsArray))
            // await this.addSuperCategories()
            // await this.addToolsToSubCategories()
            // await this.addSubCategories()
            // console.log(this.items)
        },
        async getAndFormatTools() {
            let queries = []
            let toolsDict = Object.create({});
            
            // Determine how many tools pages there are
            const toolPageNumber = await fetch('https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/tool?per_page=1')
                .then(response => response.headers.get('X-WP-Total'))
                .then(data => Math.ceil(data / 100))
            
            
            for (let i = 1; i <= toolPageNumber; i++) {
                queries.push(`https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/tool?per_page=100&page=${i}`)
            }
            
            let toolsArrays = await Promise.all(queries.map(url => fetch(url)
                .then(response => response.json())
            ))

            let allTools = await toolsArrays.flat()

            allTools.forEach(t => {
                t.categories.forEach(c => {
                    if (!_.has(toolsDict, c)) {
                        toolsDict[c] = []
                    }
                    let obj = {"1": "2"}
                    // let minTool = this.generateMinimizedTool(t)
                    toolsDict[c].push(obj)
                })
            })
            return toolsDict
        },
        generateMinimizedTool(tool) {
            let minTool = Object.create({})
            minTool.id = tool.id
            minTool.link = tool.link
            // minTool.title = tool.title
            return minTool
        },
        async getAndFormatCategories(toolsDict) {
            console.log(toolsDict)
            let subCategoriesDict = Object.create({});
            const categories = await fetch('https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/categories?per_page=100')
                .then(response => response.json())
            categories.forEach(c => {
                Object.keys(toolsDict).forEach(k => {
                    if (c.id == k) {
                        if (c.parent != 0) {
                            c['children'] = toolsDict[k]
                        } else {
                            c['children'] = []
                        }
                        subCategoriesDict[c.id] = c
                    }
                })
            })
            return subCategoriesDict
        },
        generateItems(categoriesDict) {
            let items = [];
            for (var id in categoriesDict) {
                let cat = categoriesDict[id]
                if (cat.parent != 0) {
                    categoriesDict[cat.parent].children.push(cat)
                }
            }
            for (var id in categoriesDict) {
                let cat = categoriesDict[id]
                if (cat.parent == 0) {
                    items.push(cat)
                }
            }
            return items

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