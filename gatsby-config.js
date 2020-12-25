module.exports = {
  siteMetadata: {
    siteTitle: 'AHABHGK',
    author: 'ahabhgk <ahabhgk@gmail.com>',
    siteTitleAlt: `ahabhgk's blog`,
    siteLanguage: 'zh',
    siteDescription: `ahabhgk's blog, for code, for love, for life.`,
    siteHeadline: 'for code, for love, for life.',
    siteUrl: 'https://ahabhgk.github.io',
    siteImage: 'https://avatars0.githubusercontent.com/u/42857895?s=460&v=4',
  },
  plugins: [
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: 'UA-161417298-1',
        head: true,
      },
    },
    {
      resolve: `@lekoarts/gatsby-theme-minimal-blog`,
      options: {
        mdx: false, // reload default setting for `gatsby-remark-katex`
        navigation: [
          {
            title: `Blog`,
            slug: `/blog`,
          },
          {
            title: `Note`,
            slug: `/note`,
          },
          {
            title: `Project`,
            slug: `/project`,
          },
          // {
          //   title: `Timeline`,
          //   slug: `/timeline`,
          // },
          {
            title: `About`,
            slug: `/about`,
          },
        ],
        externalLinks: [
          {
            name: `GitHub`,
            url: `https://github.com/ahabhgk`,
          },
          {
            name: `Twitter`,
            url: `https://twitter.com/ahabhgk`,
          },
          {
            name: `知乎`,
            url: `https://www.zhihu.com/people/he-geng-kun-86`,
          },
          {
            name: `Mail`,
            url: `mailto:ahabhgk@gmail.com`,
          },
        ],
        blogPath: '/blog',
        feed: true,
        feedTitle: `ahabhgk's blog`,
      },
    },
    `gatsby-plugin-sitemap`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `ahabhgk's bolg`,
        short_name: `ahabhgk's blog`,
        description: `ahabhgk's blog, for code, for love, for life.`,
        start_url: `/`,
        background_color: `#fff`,
        theme_color: `#6B46C1`,
        display: `standalone`,
        icons: [
          {
            src: `/android-chrome-192x192.png`,
            sizes: `192x192`,
            type: `image/png`,
          },
          {
            src: `/android-chrome-512x512.png`,
            sizes: `512x512`,
            type: `image/png`,
          },
        ],
      },
    },
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        extensions: [`.mdx`, `.md`],
        gatsbyRemarkPlugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 960,
              quality: 90,
              linkImagesToOriginal: false,
            },
          },
          {
            resolve: `gatsby-remark-katex`,
            options: {
              strict: false,
            },
          },
        ],
      },
    },
    `gatsby-plugin-offline`,
    `gatsby-plugin-netlify`,
    "gatsby-theme-waves",
    // `gatsby-plugin-webpack-bundle-analyser-v2`,
  ],
}
