import type * as Preset from '@docusaurus/preset-classic';
import type {Config} from '@docusaurus/types';
import type * as OpenApiPlugin from 'docusaurus-plugin-openapi-docs';

import {GROUPS, enabledGroups} from './site.config.mjs';

const TITLE = 'LDP API Docs (unofficial)';

const enabled = enabledGroups();

const enabledDirs = new Set(enabled.map((group) => group.dir));

const apiConfig: Record<string, OpenApiPlugin.Options> = Object.fromEntries(
	enabled
		.filter((group) => group.spec)
		.map((group) => [
			group.dir,
			{
				hideSendButton: true,
				outputDir: `docs/${group.dir}/reference`,
				sidebarOptions: {
					categoryLinkSource: 'tag',
					groupPathsBy: 'tag',
				},
				specPath: group.spec,
			},
		])
);

const graphqlGroup = enabled.find((group) => group.schema);

const graphqlPlugins = graphqlGroup
	? [
			[
				'@graphql-markdown/docusaurus',
				{
					baseURL: `${graphqlGroup.dir}/reference`,
					docOptions: {
						index: true,
					},
					homepage: false,
					loaders: {
						GraphQLFileLoader: '@graphql-tools/graphql-file-loader',
					},
					rootPath: './docs',
					schema: graphqlGroup.publicSchema,
				},
			],
		]
	: [];

const config: Config = {
	baseUrl: '/ldp-api-docs/',
	customFields: {
		groups: enabled.map(({dir, id, label, stability}) => ({
			dir,
			id,
			label,
			stability,
		})),
	},
	deploymentBranch: 'gh-pages',
	markdown: {
		hooks: {
			onBrokenMarkdownLinks: 'throw',
		},
	},
	onBrokenLinks: 'throw',
	organizationName: 'interaminense',
	plugins: [
		[
			'docusaurus-plugin-openapi-docs',
			{
				config: apiConfig,
				docsPluginId: 'classic',
				id: 'openapi',
			},
		],
		...graphqlPlugins,
	],
	presets: [
		[
			'classic',
			{
				blog: false,
				docs: {
					docItemComponent: '@theme/ApiItem',
					exclude: [
						'superpowers/**',
						...GROUPS.filter(
							(group) => !enabledDirs.has(group.dir)
						).map((group) => `${group.dir}/**`),
					],
					routeBasePath: '/',
					sidebarPath: './sidebars.ts',
				},
				theme: {
					customCss: './src/css/custom.css',
				},
			} satisfies Preset.Options,
		],
	],
	projectName: 'ldp-api-docs',
	tagline: 'Unofficial usage guide for the Liferay Data Platform APIs',
	themeConfig: {
		footer: {
			copyright:
				'Unofficial, community-maintained. Not a Liferay publication.',
			style: 'dark',
		},
		languageTabs: [
			{highlight: 'bash', language: 'curl', logoClass: 'curl'},
			{
				highlight: 'python',
				language: 'python',
				logoClass: 'python',
				variant: 'requests',
			},
			{
				highlight: 'javascript',
				language: 'javascript',
				logoClass: 'javascript',
				variant: 'fetch',
			},
		],
		navbar: {
			title: TITLE,
		},
	} satisfies Preset.ThemeConfig,
	themes: ['docusaurus-theme-openapi-docs'],
	title: TITLE,
	trailingSlash: false,
	url: 'https://interaminense.github.io',
};

export default config;
