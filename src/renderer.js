// 运行在 Electron 渲染进程 下的页面脚本
let options,
  styleText,
  idTImeMap = new Map();

// 首次执行检测，只有第一次执行时返回true
const first = (() => {
  const set = new Set();
  return (tag) => {
    return !set.has(tag) && !!set.add(tag);
  };
})();

// 防抖函数
function debounce(fn, time) {
  let timer = null;
  return function (...args) {
    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, time);
  };
}

// 通用初始化函数
function initFunction(func) {
  // 窗口启动的1分钟之内每隔10ms应用一次配置信息
  let timeout = new Date().getTime() + 30 * 1000;
  loop();
  function loop() {
    if (timeout > new Date().getTime()) {
      setTimeout(loop, 10);
      func();
    }
  }
}

// 通用样式加载函数
async function updateWallpaper() {
  const backgroundStyle = document.querySelector(".background-style");
  if (options.background.enabled) {
    if (!styleText) {
      styleText = await lite_tools.getStyle();
    }
    // 如果url指向图片类型则直接插入css中
    let backgroundImage = "";
    if (/\.(jpg|png|gif|JPG|PNG|GIF)$/.test(options.background.url)) {
      document.querySelector(".background-wallpaper-video")?.remove();
      backgroundImage = `:root{--background-wallpaper:url("llqqnt://local-file/${options.background.url}")}`;
    } else if (/\.(mp4|MP4)$/.test(options.background.url)) {
      let videoEl = document.querySelector(".background-wallpaper-video");
      if (!videoEl) {
        videoEl = document.createElement("video");
        videoEl.setAttribute("muted", "");
        videoEl.setAttribute("autoplay", "");
        videoEl.setAttribute("loop", "");
        videoEl.setAttribute("src", options.background.url);
        videoEl.classList.add("background-wallpaper-video");
        videoEl.volume = 0;
        if (document.querySelector(".tab-container")) {
          document.querySelector(".tab-container").appendChild(videoEl);
        } else if (document.querySelector(".container")) {
          document.querySelector(".container").appendChild(videoEl);
        } else if (document.querySelector("#app.forward")) {
          document.querySelector("#app.forward").appendChild(videoEl);
        } else {
          console.log("自定义视频挂载失败");
        }
      } else {
        if (videoEl.getAttribute("src") !== options.background.url) {
          videoEl.setAttribute("src", options.background.url);
        }
      }
    } else {
      document.querySelector(".background-wallpaper-video")?.remove();
    }
    backgroundStyle.textContent = backgroundImage + styleText;
  } else {
    backgroundStyle.textContent = "";
    document.querySelector(".background-wallpaper-video")?.remove();
  }
}

// 媒体预览增强
function imageViewer() {
  // 修复弹窗字体模糊
  document.body.classList.add("image-viewer");
  // 针对图片的单击关闭图片
  const appEl = document.querySelector("#app");
  const option = { attributes: false, childList: true, subtree: true };
  const callback = (mutationsList, observer) => {
    const img = document.querySelector(".main-area__image");
    const video = document.querySelector("embed");
    if (img && options.imageViewer.quickClose) {
      observer.disconnect();
      let isMove = false;
      img.addEventListener("mousedown", (event) => {
        if (event.button === 0) {
          isMove = false;
        }
      });
      img.addEventListener("mousemove", (event) => {
        if (event.button === 0) {
          isMove = true;
        }
      });
      img.addEventListener("mouseup", (event) => {
        let rightMenu = document.querySelector("#qContextMenu");
        if (!isMove && event.button === 0 && !rightMenu) {
          document.querySelector(`div[aria-label="关闭"]`).click();
        }
      });
    } else if (video) {
      // 判断打开的是视频
      observer.disconnect();
    }
  };
  const observer = new MutationObserver(callback);
  observer.observe(appEl, option);
}

// 首页处理
async function mainMessage() {
  // 初始化页面
  initFunction(updatePage);

  // 监听输入框上方功能
  function observerChatArea() {
    new MutationObserver((mutations, observe) => {
      document.querySelectorAll(".chat-input-area .chat-func-bar .bar-icon").forEach((el) => {
        const name = el.querySelector(".icon-item").getAttribute("aria-label");
        const find = options.textAreaFuncList.find((el) => el.name === name);
        if (find) {
          if (find.disabled) {
            el.classList.add("disabled");
          } else {
            el.classList.remove("disabled");
          }
        }
      });
      // 更新输入框上方功能列表
      const textAreaList = Array.from(document.querySelectorAll(".chat-func-bar .bar-icon"))
        .map((el) => {
          return {
            name: el.querySelector(".icon-item").getAttribute("aria-label"),
            id: el.querySelector(".icon-item").id,
            disabled: el.className.includes(".disabled"),
          };
        })
        .filter((el) => !options.textAreaFuncList.find((_el) => _el.name === el.name));
      if (textAreaList.length) {
        console.log("发送输入框上方功能列表");
        lite_tools.sendTextAreaList(textAreaList);
      }
    }).observe(document.querySelector(".chat-input-area"), {
      attributes: false,
      childList: true,
      subtree: true,
    });
  }

  // 监听聊天框上方功能
  function observeChatTopFunc() {
    new MutationObserver((mutations, observe) => {
      document.querySelectorAll(".panel-header__action .func-bar .bar-icon").forEach((el) => {
        const name = el.querySelector(".icon-item").getAttribute("aria-label");
        const find = options.chatAreaFuncList.find((el) => el.name === name);
        if (find) {
          if (find.disabled) {
            el.classList.add("disabled");
          } else {
            el.classList.remove("disabled");
          }
        }
      });
      // 更新聊天框上方功能列表
      const textAreaList = Array.from(document.querySelectorAll(".panel-header__action .func-bar .bar-icon"))
        .map((el) => {
          return {
            name: el.querySelector(".icon-item").getAttribute("aria-label"),
            id: el.querySelector(".icon-item").id,
            disabled: el.className.includes(".disabled"),
          };
        })
        .filter((el) => !options.chatAreaFuncList.find((_el) => _el.name === el.name));
      if (textAreaList.length) {
        console.log("发送聊天框上方功能列表");
        lite_tools.sendChatTopList(textAreaList);
      }
    }).observe(document.querySelector(".panel-header__action"), {
      attributes: false,
      childList: true,
      subtree: true,
    });
  }

  // 插入插槽和对应功能元素
  function observerMessageList() {
    new MutationObserver(async (mutations, observe) => {
      document.querySelectorAll(".ml-list.list .ml-item").forEach((el) => {
        if (!el.querySelector(".lite-tools-side-container")) {
          // 插入侧边插槽
          const sideContainer = document.createElement("div");
          sideContainer.classList.add("lite-tools-side-container");
          el.appendChild(sideContainer);
        }
        if (!el.querySelector(".lite-tools-bottom-container")) {
          // 插入底部插槽
          const bottomContainer = document.createElement("div");
          bottomContainer.classList.add("lite-tools-bottom-container");
        }
      });

      if (options.message.showMsgTime || options.switchReplace) {
        // 获取id和对应时间
        if (options.message.showMsgTime) {
          document.body.classList.add("show-time");
          const msgList = await lite_tools.getMsgIdAndTime();
          idTImeMap = new Map([...idTImeMap, ...msgList]);
        }
        // 显示+1按钮
        if (options.switchReplace) {
          document.body.classList.add("show-replace");
        }
        document.querySelectorAll(".ml-list.list .ml-item").forEach((el) => {
          // 创建通用侧边容器
          const msgElement = el.querySelector(".message-content__wrapper");

          if (msgElement) {
            // 插入时间气泡
            if (options.message.showMsgTime) {
              if (!el.querySelector(".message-content-time")) {
                const find = idTImeMap.get(el.id);
                if (find) {
                  const timeEl = document.createElement("div");
                  timeEl.innerText = new Date(find).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
                  timeEl.title = new Date(find).toLocaleString("zh-CN");
                  timeEl.classList.add("message-content-time");
                  if (options.message.showMsgTimeHover) {
                    msgElement.classList.add("hover-show");
                  }
                  sideContainer.appendChild(timeEl);
                }
              }
            }

            // 插入+1按钮
            if (options.switchReplace) {
              if (!el.querySelector(".message-content-replace")) {
                const replaceEl = document.createElement("div");
                replaceEl.innerText = "+1";
                replaceEl.classList.add("message-content-replace");
                replaceEl.addEventListener("click", (event) => {
                  console.log("+1被触发了");
                });
                sideContainer.insertBefore(replaceEl, sideContainer.firstChild);
              }
            }

            // 通用侧边插入容器
            if (el.querySelector(".message-container--self")) {
              msgElement.insertBefore(sideContainer, msgElement.firstChild);
            } else {
              msgElement.appendChild(sideContainer);
            }
          }
        });
      } else {
        if (!options.message.showMsgTime) {
          document.body.classList.remove("show-time");
        }
        if (!options.switchReplace) {
          document.body.classList.remove("show-replace");
        }
      }
    }).observe(document.querySelector(".ml-list.list"), {
      attributes: false,
      childList: true,
      subtree: false,
    });
  }

  // 刷新页面配置
  async function updatePage() {
    // 初始化推荐表情
    if (options.message.disabledSticker) {
      document.querySelector(".sticker-bar")?.classList.add("disabled");
    } else {
      document.querySelector(".sticker-bar")?.classList.remove("disabled");
    }
    // 初始化顶部侧边栏
    document.querySelectorAll(".nav.sidebar__nav .nav-item").forEach((el, index) => {
      const find = options.sidebar.top.find((opt) => opt.index == index);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
    // 初始化底部侧边栏
    document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item").forEach((el, index) => {
      const find = options.sidebar.bottom.find((opt) => opt.index == index);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
    // 禁用GIF热图
    if (options.message.disabledHotGIF) {
      document.body.classList.add("disabled-sticker-hot-gif");
    } else {
      document.body.classList.remove("disabled-sticker-hot-gif");
    }
    // 禁用小红点
    if (options.message.disabledBadge) {
      document.body.classList.add("disabled-badge");
    } else {
      document.body.classList.remove("disabled-badge");
    }
    // 初始化输入框上方功能
    if (document.querySelector(".chat-input-area") && first("chat-input-area")) {
      observerChatArea();
    }
    // 初始化聊天框上方功能
    if (document.querySelector(".panel-header__action") && first("chat-message-area")) {
      observeChatTopFunc();
    }
    // 消息列表监听器
    if (document.querySelector(".ml-list.list") && first("msgList")) {
      observerMessageList();
    }
    document.querySelectorAll(".chat-func-bar .bar-icon").forEach((el) => {
      const name = el.querySelector(".icon-item").getAttribute("aria-label");
      const find = options.textAreaFuncList.find((el) => el.name === name);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });

    document.querySelectorAll(".panel-header__action .func-bar .bar-icon").forEach((el) => {
      const name = el.querySelector(".icon-item").getAttribute("aria-label");
      const find = options.chatAreaFuncList.find((el) => el.name === name);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });

    // 更新自定义样式
    if (first("init-wallpaper")) {
      updateWallpaper();
    }
  }

  // 配置文件更新
  lite_tools.updateOptions((event, opt) => {
    console.log("新接口获取配置更新");
    options = opt;
    updateWallpaper();
    updatePage();
  });

  // 设置页面获取侧边栏项目
  lite_tools.optionsOpen((event, message) => {
    let top = Array.from(document.querySelectorAll(".nav.sidebar__nav .nav-item")).map((el, index) => {
      if (el.getAttribute("aria-label")) {
        if (el.getAttribute("aria-label").includes("消息")) {
          return {
            name: "消息",
            index,
            disabled: el.className.includes("disabled"),
          };
        } else {
          return {
            name: el.getAttribute("aria-label"),
            index,
            disabled: el.className.includes("disabled"),
          };
        }
      } else if (el.querySelector(".game-center-item")) {
        return {
          name: "游戏中心",
          index,
          disabled: el.className.includes("disabled"),
        };
      } else {
        return {
          name: "未知功能",
          index,
          disabled: el.className.includes("disabled"),
        };
      }
    });
    let bottom = Array.from(document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item")).map((el, index) => {
      if (el.querySelector(".icon-item").getAttribute("aria-label")) {
        return {
          name: el.querySelector(".icon-item").getAttribute("aria-label"),
          index,
          disabled: el.className.includes("disabled"),
        };
      } else {
        return {
          name: "未知功能",
          index,
          disabled: el.className.includes("disabled"),
        };
      }
    });
    lite_tools.sendSidebar({
      top,
      bottom,
    });
  });
}

// 独立聊天窗口
function chatMessage() {
  updatePage();
  initFunction(updatePage);
  async function updatePage() {
    // 禁用贴纸
    if (options.message.disabledSticker) {
      document.querySelector(".sticker-bar")?.classList.add("disabled");
    } else {
      document.querySelector(".sticker-bar")?.classList.remove("disabled");
    }
    // 禁用GIF热图
    if (options.message.disabledHotGIF) {
      document.body.classList.add("disabled-sticker-hot-gif");
    } else {
      document.body.classList.remove("disabled-sticker-hot-gif");
    }
    // 禁用输入框上方功能
    document.querySelectorAll(".chat-func-bar .bar-icon").forEach((el) => {
      const name = el.querySelector(".icon-item").getAttribute("aria-label");
      const find = options.textAreaFuncList.find((el) => el.name === name);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });

    // 禁用聊天框上方功能
    document.querySelectorAll(".panel-header__action .func-bar .bar-icon").forEach((el) => {
      const name = el.querySelector(".icon-item").getAttribute("aria-label");
      const find = options.chatAreaFuncList.find((el) => el.name === name);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });

    // 更新自定义样式
    if (first("init-wallpaper")) {
      updateWallpaper();
    }
  }
  // 配置更新
  lite_tools.updateOptions((event, opt) => {
    options = opt;
    updateWallpaper();
    updatePage();
  });
  // 附加消息发送时间
  function observerMessageList() {
    new MutationObserver(async (mutations, observe) => {
      if (options.message.showMsgTime) {
        document.body.classList.add("show-time");
        const msgList = await lite_tools.getMsgIdAndTime();
        idTImeMap = new Map([...idTImeMap, ...msgList]);
        document.querySelectorAll(".ml-list.list .ml-item").forEach((el) => {
          const find = idTImeMap.get(el.id);
          if (find) {
            const msgElement = el.querySelector(".message-content__wrapper");
            if (msgElement && !el.querySelector(".message-content-time")) {
              const timeEl = document.createElement("div");
              timeEl.innerText = new Date(find).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
              timeEl.title = new Date(find).toLocaleString("zh-CN");
              timeEl.classList.add("message-content-time");
              if (options.message.showMsgTimeHover) {
                msgElement.classList.add("hover-show");
              }
              // 自己发送的消息插入到最前面，其他人发送的消息插入到最后面
              if (el.querySelector(".message-container--self")) {
                msgElement.insertBefore(timeEl, msgElement.firstChild);
              } else {
                msgElement.appendChild(timeEl);
              }
            }
          }
        });
      } else {
        document.body.classList.remove("show-time");
      }
    }).observe(document.querySelector(".ml-list.list"), {
      attributes: false,
      childList: true,
      subtree: false,
    });
  }
  observerMessageList();
}

// 转发消息界面
function forwardMessage() {
  document.querySelector("#app").classList.add("show-time");
  document.querySelector("#app").classList.add("forward");
  updatePage();
  async function updatePage() {
    // 更新自定义样式
    if (first("init-wallpaper")) {
      updateWallpaper();
    }
  }

  // 附加消息发送时间
  function observerMessageList() {
    new MutationObserver(async (mutations, observe) => {
      if (options.message.showMsgTime) {
        document.body.classList.add("show-time");
        const msgList = await lite_tools.getMsgIdAndTime();
        idTImeMap = new Map([...idTImeMap, ...msgList]);
        lite_tools.log("查找对象", document.querySelectorAll(".list .q-scroll-view .message-container").length);
        document.querySelectorAll(".list .q-scroll-view .message-container").forEach((el) => {
          const find = idTImeMap.get(el.querySelector(".avatar-span").id.replace("-msgAvatar", ""));
          if (find) {
            lite_tools.log("找到对应消息id时间", find);
            const msgElement = el.querySelector(".message-content__wrapper");
            if (msgElement && !el.querySelector(".message-content-time")) {
              const timeEl = document.createElement("div");
              timeEl.innerText = new Date(find).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
              timeEl.title = new Date(find).toLocaleString("zh-CN");
              timeEl.classList.add("message-content-time");
              if (options.message.showMsgTimeHover) {
                msgElement.classList.add("hover-show");
              }
              // 自己发送的消息插入到最前面，其他人发送的消息插入到最后面
              if (el.className.includes("message-container--self")) {
                msgElement.insertBefore(timeEl, msgElement.firstChild);
              } else {
                msgElement.appendChild(timeEl);
              }
            }
          }
        });
      } else {
        document.body.classList.remove("show-time");
      }
    }).observe(document.querySelector(".list .q-scroll-view"), {
      attributes: false,
      childList: true,
      subtree: false,
    });
  }
  observerMessageList();

  lite_tools.updateOptions((event, opt) => {
    console.log("新接口获取配置更新");
    options = opt;
    updateWallpaper();
    updatePage();
  });
}

// 在网页搜索
function webSearch() {
  let selectText = "";
  let isRightClick = false;
  document.addEventListener("mouseup", (event) => {
    if (event.button === 2) {
      isRightClick = true;
      selectText = window.getSelection().toString();
    } else {
      isRightClick = false;
      selectText = "";
    }
  });
  new MutationObserver(() => {
    const qContextMenu = document.querySelector("#qContextMenu");
    if (qContextMenu && isRightClick && selectText.length && options.wordSearch.enabled) {
      const searchText = selectText;
      const tempEl = document.createElement("div");
      tempEl.innerHTML = document
        .querySelector("#qContextMenu [aria-disabled='false']")
        .outerHTML.replace(/<!---->/g, "");
      const item = tempEl.firstChild;
      item.id = "web-search";
      if (item.querySelector(".q-icon")) {
        item.querySelector(
          ".q-icon"
        ).innerHTML = `<svg t="1691607468711" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4164" width="200" height="200"><path d="M425.75644445 819.2C211.51288889 819.2 37.09155555 644.89244445 37.09155555 430.53511111c0-214.24355555 174.30755555-388.55111111 388.55111112-388.55111111s388.55111111 174.30755555 388.55111111 388.55111111C814.30755555 644.89244445 640 819.2 425.75644445 819.2z m0-709.06311111c-176.69688889 0-320.39822222 143.70133333-320.39822223 320.39822222S249.05955555 750.93333333 425.75644445 750.93333333s320.39822222-143.70133333 320.39822222-320.39822222-143.70133333-320.39822222-320.39822222-320.39822222z" fill="currentColor" p-id="4165"></path><path d="M828.64355555 900.096c-10.46755555 0-20.93511111-3.98222222-28.89955555-11.94666667L656.49777778 744.90311111c-15.92888889-15.92888889-15.92888889-41.87022222 0-57.91288889 15.92888889-15.92888889 41.87022222-15.92888889 57.91288889 0l143.24622222 143.24622223c15.92888889 15.92888889 15.92888889 41.87022222 0 57.91288888-8.07822222 7.96444445-18.54577778 11.94666667-29.01333334 11.94666667z" fill="currentColor" p-id="4166"></path></svg>`;
      }
      if (item.className.includes("q-context-menu-item__text")) {
        item.innerText = "搜索";
      } else {
        item.querySelector(".q-context-menu-item__text").innerText = "搜索";
      }
      item.addEventListener("click", () => {
        lite_tools.openWeb(options.wordSearch.searchUrl.replace("%search%", encodeURIComponent(searchText)));
        qContextMenu.remove();
      });
      qContextMenu.appendChild(item);
    }
  }).observe(document.querySelector("body"), { childList: true });
}

// 页面加载完成时触发
async function onLoad() {
  // 获取最新的配置信息
  options = await lite_tools.config();

  // 插入自定义样式style容器
  const backgroundStyle = document.createElement("style");
  backgroundStyle.classList.add("background-style");
  document.body.appendChild(backgroundStyle);

  // 全局加载通用样式
  const globalStyle = document.createElement("style");
  globalStyle.textContent = await lite_tools.getGlobalStyle();
  globalStyle.classList.add("global-style");
  document.body.append(globalStyle);

  // 调试用-styleCss刷新
  lite_tools.updateStyle((event, message) => {
    const element = document.querySelector(".background-style");
    if (element) {
      console.log("更新背景样式");
      let backgroundImage = "";
      if (/\.(jpg|png|gif|JPG|PNG|GIF)/.test(options.background.url)) {
        backgroundImage = `:root{--background-wallpaper:url("llqqnt://local-file/${options.background.url}")}`;
      }
      element.textContent = backgroundImage + message;
    }
  });
  // 调试用-globalCss刷新
  lite_tools.updateGlobalStyle((event, message) => {
    const element = document.querySelector(".global-style");
    element.removeAttribute("href");
    if (element) {
      console.log("更新全局样式");
      element.textContent = message;
    }
  });

  // 所有页面都需要执行的更新操作
  updatePage();
  lite_tools.updateOptions((event, opt) => {
    console.log("新接口获取配置更新");
    options = opt;
    updatePage();
  });

  function updatePage() {
    // 禁用滑动多选消息
    if (options.message.disabledSlideMultipleSelection) {
      document.body.classList.add("disabled-slide-multiple-selection");
    } else {
      document.body.classList.remove("disabled-slide-multiple-selection");
    }
    // 全局加载监听选中文本事件
    if (first("web-search")) {
      webSearch();
    }
  }

  // 监听导航跳转
  navigation.addEventListener("navigatesuccess", () => {
    let hash = location.hash;
    if (hash.includes("#/chat/")) {
      hash = "#/chat/message";
    } else if (hash.includes("#/forward")) {
      hash = "#/forward";
    }
    lite_tools.log(`新页面参数 ${hash}`);
    switch (hash) {
      case "#/imageViewer":
        imageViewer();
        break;
      case "#/main/message":
        mainMessage();
        break;
      case "#/chat/message":
        chatMessage();
        break;
      case "#/forward":
        forwardMessage();
        break;
    }
  });
}

// 打开设置界面时触发
async function onConfigView(view) {
  const plugin_path = LiteLoader.plugins.lite_tools.path.plugin;
  const css_file_path = `llqqnt://local-file/${plugin_path}/src/config/view.css`;
  const html_file_path = `llqqnt://local-file/${plugin_path}/src/config/view.html`;

  // CSS
  const link_element = document.createElement("link");
  link_element.rel = "stylesheet";
  link_element.href = css_file_path;
  document.head.appendChild(link_element);

  // HTMl
  const html_text = await (await fetch(html_file_path)).text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html_text, "text/html");
  doc.querySelectorAll("section").forEach((node) => view.appendChild(node));

  lite_tools.updateSettingStyle((event,message) => {
    console.log("更新设置样式");
    link_element.href = css_file_path+`?r=${new Date()}`;
  })

  // 更新配置信息
  options = await lite_tools.config();

  // 显示插件版本信息
  view.querySelector(".version .link").innerText = LiteLoader.plugins.lite_tools.manifest.version;
  view.querySelector(".version .link").addEventListener("click", () => {
    lite_tools.openWeb("https://github.com/xiyuesaves/lite_tools/tree/v3");
  });

  // 向设置界面插入动态选项
  function addOptionLi(list, element, objKey, key) {
    list.forEach((el, index) => {
      const hr = document.createElement("hr");
      hr.classList.add("horizontal-dividing-line");
      const li = document.createElement("li");
      li.classList.add("vertical-list-item");
      const switchEl = document.createElement("div");
      switchEl.classList.add("q-switch");
      if (!el[key]) {
        switchEl.classList.add("is-active");
      }
      switchEl.setAttribute("index", index);
      switchEl.addEventListener("click", function () {
        Function("options", `options.${objKey}[${index}].${key} = ${this.className.includes("is-active")}`)(options);
        this.classList.toggle("is-active");
        lite_tools.config(options);
      });
      const span = document.createElement("span");
      span.classList.add("q-switch__handle");
      switchEl.appendChild(span);
      const title = document.createElement("h2");
      title.innerText = el.name;
      li.append(title, switchEl);
      element.append(hr, li);
    });
  }

  // 获取侧边栏按钮列表
  options.sidebar = await lite_tools.getSidebar({ type: "get" });
  const sidebar = view.querySelector(".sidebar ul");
  addOptionLi(options.sidebar.top, sidebar, "sidebar.top", "disabled");
  addOptionLi(options.sidebar.bottom, sidebar, "sidebar.bottom", "disabled");

  // 添加输入框上方功能列表
  addOptionLi(options.textAreaFuncList, view.querySelector(".textArea ul"), "textAreaFuncList", "disabled");

  // 添加聊天框上方功能列表
  addOptionLi(options.chatAreaFuncList, view.querySelector(".chatArea ul"), "chatAreaFuncList", "disabled");

  // 列表展开功能
  view.querySelectorAll(".wrap .vertical-list-item.title").forEach((el) => {
    el.addEventListener("click", function (event) {
      const wrap = this.parentElement;
      wrap.querySelector(".icon").classList.toggle("is-fold");
      wrap.querySelector("ul").classList.toggle("hidden");
    });
  });

  // 划词搜索
  addSwitchEventlistener("wordSearch.enabled", ".switchSelectSearch", (_, enabled) => {
    if (enabled) {
      view.querySelector(".select-search-url").classList.remove("hidden");
    } else {
      view.querySelector(".select-search-url").classList.add("hidden");
    }
    if (first("init-worldSearch-option")) {
      const searchEl = view.querySelector(".search-url");
      searchEl.value = options.wordSearch.searchUrl;
      searchEl.addEventListener(
        "input",
        debounce(() => {
          options.wordSearch.searchUrl = searchEl.value;
          console.log("更新搜索url", searchEl.value);
          lite_tools.config(options);
        }, 100)
      );
    }
  });

  // 快速关闭图片
  addSwitchEventlistener("imageViewer.quickClose", ".switchQuickCloseImage");

  // 复读机
  addSwitchEventlistener("switchReplace", ".switchReplace");

  // 禁用推荐表情
  addSwitchEventlistener("message.disabledSticker", ".switchSticker");

  // 禁用表情GIF热图
  addSwitchEventlistener("message.disabledHotGIF", ".switchHotGIF");

  // 禁用红点
  addSwitchEventlistener("message.disabledBadge", ".disabledBadge");

  // 将哔哩哔哩小程序替换为url卡片
  addSwitchEventlistener("message.convertMiniPrgmArk", ".switchDisabledMiniPrgm");

  // 自动打开来自手机的链接或者卡片消息
  addSwitchEventlistener("message.autoOpenURL", ".switchAutoOpenURL");

  // debug开关
  addSwitchEventlistener("debug", ".switchDebug");

  // 显示每条消息发送时间
  addSwitchEventlistener("message.showMsgTime", ".showMsgTime", (_, enabled) => {
    if (enabled) {
      view.querySelector(".hover-show-hidden").classList.remove("hidden");
    } else {
      view.querySelector(".hover-show-hidden").classList.add("hidden");
    }
  });

  // 添加消息后缀
  addSwitchEventlistener("tail.enabled", ".msg-tail", (_, enabled) => {
    if (enabled) {
      view.querySelector(".message-tail").classList.remove("hidden");
    } else {
      view.querySelector(".message-tail").classList.add("hidden");
    }
    if (first("init-tail-option")) {
      const tailEl = view.querySelector(".tail-content");
      tailEl.value = options.tail.content;
      tailEl.addEventListener(
        "input",
        debounce(() => {
          options.tail.content = tailEl.value;
          lite_tools.config(options);
        }, 100)
      );
    }
  });

  // 移入才显示时间
  addSwitchEventlistener("message.showMsgTimeHover", ".showMsgTimeHover");

  // 禁用滑动多选消息
  addSwitchEventlistener("message.disabledSlideMultipleSelection", ".switchDisabledSlideMultipleSelection");

  // 自定义背景
  addSwitchEventlistener("background.enabled", ".switchBackgroundImage", (_, enabled) => {
    if (enabled) {
      view.querySelector(".select-path").classList.remove("hidden");
    } else {
      view.querySelector(".select-path").classList.add("hidden");
    }
    if (first("init-background-option")) {
      view.querySelector(".select-path input").value = options.background.url;
      view.querySelectorAll(".select-file").forEach((el) => {
        el.addEventListener("click", () => {
          lite_tools.openSelectBackground();
        });
      });
    }
  });

  // 初始化设置界面
  function addSwitchEventlistener(optionKey, switchClass, callback) {
    const option = Function("options", `return options.${optionKey}`)(options);
    if (option) {
      view.querySelector(switchClass).classList.add("is-active");
    } else {
      view.querySelector(switchClass).classList.remove("is-active");
    }
    // 初始化时执行一次callback方法
    if (callback) {
      callback(null, option);
    }
    view.querySelector(switchClass).addEventListener("click", function (event) {
      this.classList.toggle("is-active");
      options = Object.assign(
        options,
        Function("options", `options.${optionKey} = ${this.className.includes("is-active")}; return options`)(options)
      );
      lite_tools.config(options);
      if (callback) {
        callback(event, this.className.includes("is-active"));
      }
    });
  }

  // 监听设置文件变动
  lite_tools.updateOptions((event, opt) => {
    options = opt;
    view.querySelector(".select-path input").value = options.background.url;
  });
}

// 这两个函数都是可选的
export { onLoad, onConfigView };
