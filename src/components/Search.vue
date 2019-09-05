<template>
	<v-card class="mx-auto square" max-width="1000" flat>
		<v-flex class="header">CNS Tool Search</v-flex>
		<v-sheet class="pa-4 square" color="#EFEFEF">
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
		<v-progress-linear color="#31B2A3" :active="loading" :indeterminate="loading" bottom></v-progress-linear>
		<v-card-text v-if="!loading">
			<v-treeview :items="items" :search="search" :filter="filter" :open.sync="open" open-on-click>
				<template v-slot:prepend="{ item }">
					<h3 v-if="item.isTool">-</h3>
				</template>
				<template v-slot:append="{ item }">
					<a class="tool-link" v-if="item.isTool" :href="item.link" target="_blank"></a>
					<img v-if="item.featured_image" class="thumbnail" :src="item.featured_image" alt />
				</template>
			</v-treeview>
		</v-card-text>
	</v-card>
</template>

<script>
import _ from "lodash";

export default {
	data: () => ({
		items: [],
		filteredOpen: [],
		open: [],
		search: null,
		loading: false,
		settings: {
			headers: {
				Authorization: ""
			}
		}
	}),
	methods: {
		async getAuthorization() {
			const url =
				"https://cns1.rc.fas.harvard.edu/wp-json/jwt-auth/v1/token";
			const payload = {
				username: "nice",
				password: "hXLDaT9DDwRehFaE3EKy"
			};
			const settings = {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(payload)
			};
			return await fetch(url, settings)
				.then(res => res.json())
				.catch(err => console.error(err));
		},
		async generateItems() {
			this.loading = true;
			let items = [];

			const tools = await this.getAndFormatTools();
			const categories = await this.getAndFormatCategories(tools);

			// Add grandparent categories to items
			categories.forEach(cat => {
				if (cat.parent == 0) {
					items.push(cat);
				}
			});

			// Add parent categories to grandparents in items
			items.forEach(item => {
				categories.forEach(cat => {
					if (item.id == cat.parent) {
						item.children.push(cat);
					}
				});
			});

			return items;
		},

		async getAndFormatTools() {
			// Get all tools
			let tools = await fetch(
				"https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/tool-search/"
			).then(response => response.json());

			// Loop through tools array and generate new minimal tool objets
			await tools.forEach(tool => {
				tool.isTool = true;
				tool.link = `https://cns1.rc.fas.harvard.edu${tool.link}`;
			});
			return await tools;
		},

		async getAndFormatCategories(tools) {
			let formattedCategories = [];

			// Get all categories
			const categories = await fetch(
				"https://cns1.rc.fas.harvard.edu/wp-json/wp/v2/categories?per_page=100"
			)
				.then(response => response.json())
				.catch(err => console.error(err));

			// Loop through categories array and generate new minimal category objects
			await categories.forEach(cat => {
                // Check if category is one of the unncessary categories
				if (
					["admin", "news", "uncategorized", "research"].includes(
						cat.slug
					)
				)
                    return;
                // Create a formatted category object
				let formCat = Object.create({});
				// Get children of this category
				formCat.children = this.getChildrenOfCategory(tools, cat);
				formCat.id = cat.id;
				formCat.link = cat.link;
				formCat.parent = cat.parent;
				formCat.name = cat.name;
				formCat.slug = cat.slug;
				formCat.isTool = false;
				formattedCategories.push(formCat);
			});
			return formattedCategories;
		},

		getChildrenOfCategory(tools, cat) {
			let childrenOfCategory = [];
			// If category is not a grandparent
			if (cat.parent != 0)
				// Check if tool belongs to the category
				tools.forEach(tool => {
					if (tool.terms.includes(cat.id)) {
						tool.parent = cat.id;
						tool.grandparent = cat.parent;
						childrenOfCategory.push(tool);
					}
				});
			return childrenOfCategory;
        },
		removeDups(value, index, self) {
			return self.indexOf(value) === index;
		},

		// Finalize loading process
		loadItems(items) {
			this.items = items;
			this.loading = false;
		}
	},
	computed: {
		// Custom filter function
		filter() {
			return (item, search, textKey) => {
				// If it's not a tool, it shouldn't be a part of the search
				if (!item.isTool) return;
				// Make item info lowercase and remove spaces
				let name = item[textKey].toLowerCase().replace(/\s/g, "");
				// Check if search is in name
				let result = name.indexOf(search.toLowerCase()) > -1;
				if (result && item.parent && item.grandparent) {
					// If found, add item parents to filteredopen, which will trigger the open functionality
					this.filteredOpen.push(item.parent);
					this.filteredOpen.push(item.grandparent);
				}
				return result;
			};
		}
	},
	watch: {
		filteredOpen: function() {
			// As filteredOpen changes, this will update existing open array
			// Existing open array cannot be mutated directly due to Vue reactivity issues
			this.open = this.filteredOpen.filter(this.removeDups);
		},
		// If the search box is made empty, close all items
		search: function(newSearch, oldSearch) {
			if (newSearch == "" || newSearch == null) {
				this.open = [];
			}
		}
	},
	beforeMount: function() {
		this.getAuthorization().then(
			auth => (this.settings.headers.Authorization = auth.token)
		);
	},
	mounted: function() {
		this.generateItems().then(items => this.loadItems(items));
	}
};
</script>

<style>
.tool-link {
	width: 100%;
	height: 100%;
	position: absolute;
	z-index: 100;
}
.header {
	background-color: #31b2a3;
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