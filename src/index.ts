import { Plugin, showMessage } from "siyuan";
import * as api from "./api";
import imageCompression from "browser-image-compression";

export default class PluginSample extends Plugin {
  private Hpath: string;
  private notebookId: string;
  private pageId: string;
  private compressSuffix: string = "webp";

  async onload(): Promise<void> {
  }

  async onunload(): Promise<void> {
  }

  async onLayoutReady(): Promise<void> {
    this.eventBus.on("paste", this.handlePaste.bind(this));
    this.eventBus.on("switch-protyle", (e) => {
      this.Hpath = "";
      this.notebookId = "";
      this.pageId = "";
    });
  }

  async getAssetsSavePath(pagePath: string) {
    const hpath = await api.getHPathByPath(this.notebookId, pagePath);
    const notebookName = await api.getNotebookConf(this.notebookId);
    return notebookName.name + hpath + "/";
  }

  async handlePaste(e) {
    const { files, protyle } = e.detail;
    //规定传参数组：[块id,file对象]
    const filesList:any[] = [];
    if (files?.length === 0) return;
    for (let index = 0; index < files.length; index++) {
      let file = files[index];
      const checkNodes = file.type.split("/");
      if (checkNodes[0] !== "image" && this.checkImage(checkNodes[1])) return;
      //多图上传处理未实现，过滤
      if (files?.length > 1) {
        files.length = 0;
        showMessage("检测到一次有多个文件上传,如果需要对图片进行压缩,请一次上传文件");
        return;
      }
      //检测图片是否为拖拽插入，是则转换为File对象
      if (file[Symbol.toStringTag] === "DataTransferItem"){
        file = new File([file.getAsFile()], file.getAsFile().name, {
          type: file.getAsFile().type
     });
    }
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
    this.processingPictures(filesList);
  }

  //压缩图片
  async processingPictures(files: any[]) {
    const fileList = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const compressedFile = await this.compressImage(file[1]);
      if (compressedFile) {
        fileList.push([file[0],
          new File([compressedFile], `${file[1].name.split('.')[0]+'.'+this.compressSuffix}`, {
            type: this.compressSuffix,
          })
        ]);
      } else {
        showMessage(`${file[1].name}压缩失败, 请检查图片`);
      }
    }
    this.uploadToSiyuanServer(fileList);
  }
  //上传资源图片
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
    //更新块为压缩图片的md语法
    for (let index = 0; index < files.length; index++) {
      await api.updateBlock("markdown", `![${files[index][1].name}](${fileList[index][1]})`, fileList[index][0]);
    }
    this.remoteAssetsImageFile(await api.readDir("/data/assets"));
  }

  //删除assets目录下的图片（原资源图片存放路径）
  private async remoteAssetsImageFile(assets: IResReadDir): Promise<void> {
    for (let index = 0; index < assets?.length; index++) {
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
      console.log("压缩图片失败:");
      return null;
    }
  }

  //检查是否为合法后缀的图片
  private checkImage(fileType: string): boolean {
    const whiteImageType = ["jpeg", "jpg", "png", "webp"];
    if (!whiteImageType.includes(fileType)) return false;
    return true;
  }
}
