<p align="center">
  <a href="https://ahabhgk.github.io">
    <img alt="ahabhgk" src="https://avatars0.githubusercontent.com/u/42857895?s=460&v=4" />
  </a>
</p>
<h1 align="center">
  ahabhgk's blog
</h1>

<p align="center">
  <a href="https://github.com/LekoArts/gatsby-starter-minimal-blog/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Minimal Blog is released under the MIT license." />
  </a>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome!" />
</p>

## 📝 Dev

Since this repository is a `.github.io` repository, you can only send the display page to the master branch. When writing blogs or developing new features, you need to work on the dev branch. After you push it to the remote dev branch, CI will automatically upload the display page to the master branch and release it.

## ✨ Features

- MDX
- Fully customizable through the usage of Gatsby Themes (and Theme UI)
- Light Mode / Dark Mode
- Typography driven, minimal style
- Tags/Categories support
- Code highlighting with [prism-react-renderer](https://github.com/FormidableLabs/prism-react-renderer) and [react-live](https://github.com/FormidableLabs/react-live) support. Also allows adding line numbers, line highlighting, language tabs, and file titles.
- RSS Feed for blog posts
- Google Analytics Support
- SEO (Sitemap, OpenGraph tags, Twitter tags)
- Offline Support & WebApp Manifest

## 🐤 Examples

**Frontmatter reference:**

```md
---
title: Introduction to "Defence against the Dark Arts"
date: 2019-11-07
description: Defence Against the Dark Arts (abbreviated as DADA) is a subject taught at Hogwarts School of Witchcraft and Wizardry and Ilvermorny School of Witchcraft and Wizardry.
tags:
  - Tutorial
  - Dark Arts
banner: ./defence-against-the-dark-arts.jpg
---
```

**The fields `description` and `banner` are optional!** If no description is provided, an excerpt of the blog post will be used. If no banner is provided, the default `siteImage` (from `siteMetadata`) is used.

The `date` field has to be written in the format `YYYY-MM-DD`!

**highlights**

````
```js {2,4-5}
const test = 3
const foo = 'bar'
const harry = 'potter'
const hermione = 'granger'
const ron = 'weasley'
```
````

**Hide line numbers:**

````
```text noLineNumbers
Harry Potter and the Chamber of Secrets
```
````

**react-live:**

````
```js react-live
const onClick = () => {
  alert("You opened me");
};
render(<button onClick={onClick}>Alohomora!</button>);
```
````

**code with title**

````
```jsx:title=src/components/post.jsx {5-7,10}
import React from "react"

const Post = ({ data: { post } }) => (
  <Layout>
    <Heading variant="h2" as="h2">
      {post.title}
    </Heading>
    <section>
      <MDXRenderer>{post.body}</MDXRenderer>
    </section>
  </Layout>
)

export default Post
```
````

**Code block with only the title**

````
```:title=src/utils/scream.js
const scream = (input) => window.alert(input)
```
````
