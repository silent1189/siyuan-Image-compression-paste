import { Plugin, showMessage } from "siyuan";
import * as api from "./api";
import imageCompression from "browser-image-compression";
import { resolveSoa } from "dns";

export default class PluginSample extends Plugin {
  private Hpath: string;
  private notebookId: string;
  private pageId: string;
  private compressSuffix: string = "webp";

  async onload(): Promise<void> {
    console.log("插件已加载");
  }

  async onunload(): Promise<void> {
    console.log("插件已卸载");
  }

  async onLayoutReady(): Promise<void> {
    this.eventBus.on("paste", this.handlePaste.bind(this));
    this.eventBus.on("switch-protyle", (e) => {
      this.Hpath = "";
      this.notebookId = "";
      this.pageId = "";
      console.log("切换页面了");
    });
  }

  async getAssetsSavePath(pagePath: string) {
    const hpath = await api.getHPathByPath(this.notebookId, pagePath);
    const notebookName = await api.getNotebookConf(this.notebookId);
    return notebookName.name + hpath + "/";
  }

  async handlePaste(e) {
    const { files, protyle } = e.detail;
    const filesList:any[] = [];
    if (files?.length === 0) return;
    for (let index = 0; index < files.length; index++) {
      let file = files[index];
      const checkNodes = file.type.split("/");
      if (checkNodes[0] !== "image" && this.checkImage(checkNodes[1])) return;
      if (files?.length > 1) {
        showMessage("检测到一次有多个文件上传, 请一次上传文件");
        files.length = 0;
        return;
      }
      //检测图片是否为拖拽插入，是则转换为File对象
      if (file[Symbol.toStringTag] === "DataTransferItem"){
        file = new File([file.getAsFile()], file.getAsFile().name, {
          type: file.getAsFile().type
     });
    }
    //console.log(file[Symbol.toStringTag].includes("DataTransferItem"));
      if (this.notebookId + this.Hpath + this.pageId === "") {
        //初始化全局变量: 设置上传路径
        this.pageId = protyle.block.id;
        this.notebookId = protyle.notebookId;
        this.Hpath =
          ["assets", (await api.getNotebookConf(this.notebookId)).name].join(
            "/"
          ) + (await api.getHPathByID(this.pageId));
      }
      filesList.push([protyle.block.id,file]);
    }
    //console.log(filesList);
    //操作图片
    this.processingPictures(filesList);

    // if (files?.length === 0) return;
    // if (files?.length > 1) {
    //   new Dialog({
    //     title: "警告",
    //     content:
    //       "检测到一次有多个文件上传,如果继续操作会导致思源笔记出错闪退, 请一次上传文件",
    //     width: "500px",
    //     height: "100px",
    //     // 其他配置...
    //   });
    //   files.length = 0;
    //   return;
    // }
    // for (let index = 0; index < files.length; index++) {
    //   const file = files[index];
    //   if (this.checkImage(file.type) === "") return;
    //   if (this.notebookId + this.Hpath + this.pageId === "") {
    //     //初始化全局变量: 设置上传路径
    //     this.pageId = protyle.block.id;
    //     this.notebookId = protyle.notebookId;
    //     this.Hpath =
    //       ["assets", (await api.getNotebookConf(this.notebookId)).name].join(
    //         "/"
    //       ) + (await api.getHPathByID(this.pageId));
    //   }

    //   //压缩图片
    //   const compressedFile = await this.compressImage(file);
    //   //console.log("修改后的文件名: ",newFileName);
    //   const renamedFile = new File([compressedFile], `${file.name}`, {
    //     //type: compressedFile.type
    //   });
    //   fileList.push(renamedFile);
    //   //上传资源图片
    //   const imagePath = (await api.upload(this.Hpath, [renamedFile])).succMap[
    //     "image.png"
    //   ];
    //   await api.updateBlock(
    //     "markdown",
    //     `![${file.name}](${imagePath})`,
    //     protyle.block.id
    //   );
    //   //删除原目录下的图片
    //   this.remoteAssetsImageFile(await api.readDir("/data/assets"));
    //}
  }

  //压缩图片并上传
  async processingPictures(files: any[]) {
    const fileList = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      //console.log(file);
      //压缩图片
      const compressedFile = await this.compressImage(file[1]);
      if (compressedFile) {
        fileList.push([file[0],
          new File([compressedFile], `${file[1].name.split('.')[0]+'.'+this.compressSuffix}`, {
            type: this.compressSuffix,
          })
        ]);
        //console.log(fileList);
      } else {
        showMessage(`${file[1].name}压缩失败, 请检查图片`);
      }
    }
    //console.log(fileList);
    this.uploadToSiyuanServer(fileList);
  }

  async uploadToSiyuanServer(files: any[]) {
    const fileList:any[] = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index][1];
      fileList.push(file);
    }
    const result = await api.upload(this.Hpath, fileList);
    fileList.length = 0;
    for (let index = 0; index < files.length; index++) {
      fileList.push([files[index][0],result.succMap[files[index][1].name]]);
    }
    //console.log(files[0][1]); //id
    //console.log(fileList[1]); //path

    //await api.updateBlock("markdown", `![${files[0][1].name}](${files[0][1]})`, files[0][0]);
    for (let index = 0; index < files.length; index++) {
      //console.log(await api.updateBlock("markdown", `![${files[index][1].name}](${fileList[index][1]})`, fileList[index][0]));
    }
    //console.log(result.succMap);
    // console.log(await api.readDir("/data/assets"));
  }

  private async remoteAssetsImageFile(assets: IResReadDir): Promise<void> {
    for (let index = 0; index < assets.length; index++) {
      const element = assets[index];
      if (!element.isDir) {
        await api.removeFile("/data/assets/" + element.name);
      }
    }
  }

  // 压缩单个图片
  private async compressImage(imageFile: File) {
    const options = {
      maxSizeMB: 0.75,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/"+this.compressSuffix, //修改压缩后的后缀格式
    };

    try {
      const compressedFile = await imageCompression(imageFile, options);
      showMessage(
        `${(imageFile.size / 1024 / 1024).toFixed(2)}MB -> ${(
          compressedFile.size /
          1024 /
          1024
        ).toFixed(2)}MB ` +
          `(压缩率: ${(
            (1 - compressedFile.size / imageFile.size) *
            100
          ).toFixed(1)}%)`
      );
      return compressedFile;
    } catch (error) {
      console.error("压缩图片失败:", error);
      return null;
    }
  }

  private checkImage(fileType: string): boolean {
    const whiteImageType = ["jpeg", "jpg", "png", "webp"];
    if (!whiteImageType.includes(fileType)) return false;
    return true;
  }
}
