import wavesTheme from "gatsby-theme-waves/src/gatsby-plugin-theme-ui/index"
import blogTheme from "@lekoarts/gatsby-theme-minimal-blog/src/gatsby-plugin-theme-ui/index"
import merge from "deepmerge"
import "katex/dist/katex.min.css"
import Prism from "prism-react-renderer/prism"

(typeof global !== "undefined" ? global : window).Prism = Prism

require("prismjs/components/prism-ruby.min.js")
require("prismjs/components/prism-io.min.js")
require("prismjs/components/prism-prolog.min.js")
require("prismjs/components/prism-scala.min.js")
require("prismjs/components/prism-erlang.min.js")
require("prismjs/components/prism-clojure.min.js")
require("prismjs/components/prism-haskell.min.js")
require("prismjs/components/prism-scheme.min.js")
require("prismjs/components/prism-rust.min.js")
require("prismjs/components/prism-swift.min.js")
require("prismjs/components/prism-http.min.js")

export default merge(blogTheme, wavesTheme)
