# **思源笔记插件-siyuan-Image-compression-paste**

> 作用：使用思源笔记编写文档时，通过粘贴或拖拽的方式将图片插入到页面中，会自动将插入的图片进行压缩，压缩完成后会将压缩图片插入页面中，压缩图片的文件格式为`webp`，同时压缩的图片会根据文档树进行分类存放

**插件优点:** 优化思源笔记的资源图片管理方式，将插入的图片根据文档树的路径保存，避免大量资源文件堆积在assets目录下，实现根据文档树路径管理资源文件

**插件缺点:** 

- 本插件的开发者可以归类为思源笔记插件开发小白，花了几天时间参考模板示例：[plugin-sample](https://github.com/siyuan-note/plugin-sample)、[plugin-sample-vite-svelte](https://github.com/siyuan-note/plugin-sample-vite-svelte)、[plugin-sample-vite](https://github.com/frostime/plugin-sample-vite)，插件快速开发文档：[插件开发 Quick Start](https://ld246.com/article/1723732790981)，思源笔记官方API文档：[后端API](https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md)、[前端API](https://github.com/siyuan-note/petal/blob/main/siyuan.d.ts)，以及各类大模型，才获得了插件开发的实现思路和代码能力

- 插件目前仅实现了`[webp|jpg|jprg|png]`四种图片格式的压缩，且压缩后的图片格式只会保存为`.webp`，同时仅支持单张图片的上传，对多张图片的插入则不会进行压缩处理
- 插件基于[plugin-sample-vite-svelte](https://github.com/siyuan-note/plugin-sample-vite-svelte)进行开发，在调用更新块时出现了错误，可能会导致页面刷新，会有些BUG，如果大佬们介意的话可以放弃使用
