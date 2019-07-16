/**
 * 音频播放器
 * @param {Object} option 
 */
function APlayer(option) {
    // 处理错误的选项
    if (!('music' in option && 'title' in option.music && 'author' in option.music && 'url' in option.music && 'pic' in option.music)) {
        throw 'APlayer Error: Music, music.title, music.author, music.url, music.pic are required in options';
    }
    if (option.element === null) {
        throw 'APlayer Error: element option null';
    }

    this.isMobile = navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);
    // 兼容性:一些移动浏览器不支持自动播放
    if (this.isMobile) {
        option.autoplay = false;
    }

    // 基本任选项参数
    var defaultOption = {
        element: document.getElementsByClassName('aplayer')[0],
        narrow: false,
        autoplay: false,
        showlrc: false,
        height: 106,
        width: 500,
        lineHeight: 20,
        fontSize: 12,
        volume: 0.1
    };
    for (var defaultKey in defaultOption) {
        if (defaultOption.hasOwnProperty(defaultKey) && !option.hasOwnProperty(defaultKey)) {
            option[defaultKey] = defaultOption[defaultKey];
        }
    }

    this.option = option;
}
/**
 * 初始化音频播放器
 */
APlayer.prototype.init = function () {
    this.element = this.option.element;
    this.music = this.option.music;
    this.element.style.height = this.option.height + 'px';
    this.element.style.width = this.option.width + 'px';
    // lrc解析器
    if (this.option.showlrc) {
        /**
         * 时间集合
         */
        this.lrcTime = [];
        /**
         * 内容集合
         */
        this.lrcLine = [];
        /**
         * 提取lrc文本内容
         */
        var lrcs = this.element.getElementsByClassName('aplayer-lrc-content')[0].innerHTML;
        /**
         * 过滤出行集合
         */
        var lines = lrcs.split(/\n/);
        var timeExp = /\[(\d{2}):(\d{2})\.(\d{2})]/;
        var lrcExp = /](.*)$/;
        var notLrcLineExp = /\[[A-Za-z]+:/;
        for (var i = 0; i < lines.length; i++) {
            /**
             * 单行文本内容清除前后空格
             */
            lines[i] = lines[i].replace(/^\s+|\s+$/g, '');
            /**
             * 匹配出分秒毫秒集合
             */
            var oneTime = timeExp.exec(lines[i]);
            /**
             * 匹配出单行歌词
             */
            var oneLrc = lrcExp.exec(lines[i]);
            /**
             * 若匹配失败抛出错误
             */
            if (oneTime && oneLrc && !lrcExp.exec(oneLrc[1])) {
                this.lrcTime.push(parseInt(oneTime[1]) * 60 + parseInt(oneTime[2]) + parseInt(oneTime[3]) / 1000);
                this.lrcLine.push(oneLrc[1]);
            } else if (lines[i] && !notLrcLineExp.exec(lines[i])) {
                throw 'APlayer Error: lrc format error : should be like `[mm:ss.xx]lyric` : ' + lines[i];
            }
        }
    }

    /**
     * 填写HTML
     */
    this.element.innerHTML = '' +
        /* 左侧封面及暂停播放容器 */
        '<div class="aplayer-pic">' +
        '<img src="' + this.music.pic + '">' +
        '<div class="aplayer-button aplayer-pause aplayer-hide">' +
        '<i class="demo-icon aplayer-icon-pause"></i>' +
        '</div>' +
        '<div class="aplayer-button aplayer-play">' +
        '<i class="demo-icon aplayer-icon-play"></i>' +
        '</div>' +
        '<div class="aplayer-music">' +
        '<span class="aplayer-title">' + this.music.title + '</span>' +
        '<span class="aplayer-author"> - (＞﹏＜)加载中,好累的说...</span>' +
        '</div>' +
        '</div>' +
        /* 右侧播放控件、歌词、进度条等内容的容器 */
        '<div class="aplayer-info">' +
        '<div class="aplayer-lrc">' +
        '<div class="aplayer-lrc-contents" style="transform: translateY(0);"></div>' +
        '</div>' +
        '<div class="aplayer-controller">' +
        '<div class="aplayer-bar-wrap">' +
        '<div class="aplayer-bar">' +
        '<div class="aplayer-loaded" style="width: 0"></div>' +
        '<div class="aplayer-played" style="width: 0">' +
        '<span class="aplayer-thumb"></span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="aplayer-time">' +
        '<span class="aplayer-ptime">00:00</span> / <span class="aplayer-dtime">(oﾟ▽ﾟ)</span>' +
        '<div class="aplayer-volume-wrap">' +
        '<i class="demo-icon aplayer-icon-volume-down"></i>' +
        '<div class="aplayer-volume-bar-wrap">' +
        '<div class="aplayer-volume-bar">' +
        '<div class="aplayer-volume" style="height: ' + (this.option.volume * 100) + '%"></div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>';

    /**
     * 填写lrc
     */
    if (this.option.showlrc) {
        /* 添加样式类改变容器大小 */
        this.element.classList.add('aplayer-withlrc');
        var lrcHTML = '';
        this.lrcContents = this.element.getElementsByClassName('aplayer-lrc-contents')[0];
        for (i = 0; i < this.lrcLine.length; i++) {
            /* 拼接歌词标签 */
            lrcHTML += '<p style="height:' + this.option.lineHeight +
                'px;line-height:' + this.option.lineHeight +
                'px;font-size:' + this.option.fontSize + 'px;">' +
                '<span class="move_music">' + this.lrcLine[i] + '<span>' + this.lrcLine[i] +
                '</span></span></p>';
        }
        /* 挂载歌词 */
        this.lrcContents.innerHTML = lrcHTML;
        this.lrcIndex = 0;
        this.lrcContents.getElementsByTagName('p')[0].classList.add('aplayer-lrc-current');
    }

    /**
     * 切换aplayer-narrow类
     * 控制是否显示右侧播放控件容器
     */
    if (this.option.narrow) {
        this.element.classList.add('aplayer-narrow');
    }

    /* 创建音频元素 */
    this.audio = document.createElement("audio");
    /* 加载音频内容 */
    this.audio.src = this.music.url;
    /* 循环播放 */
    this.audio.loop = true;
    /**
     * 规定是否预加载音频
     * 值：
     *      auto - 当页面加载后载入整个音频
     *      meta - 当页面加载后只载入元数据
     *      none - 当页面加载后不载入音频
     */
    this.audio.preload = 'metadata';

    var _self = this;
    /**
     * 注册 durationchange 事件
     * 当指定音频/视频的时长数据发生变化时触发
     * 监听获取音频时间
     */
    this.audio.addEventListener('durationchange', function () {
        /* 兼容性:Android浏览器会首先输出1 */
        if (_self.audio.duration !== 1) {
            /**
             * _self.audio.duration
             * 获取音频总长度
             * 单位秒
             */
            _self.element.getElementsByClassName('aplayer-dtime')[0].innerHTML = _self.secondToTime(_self.audio.duration);
        }
    });

    /**
     * 注册 loadedmetadata 事件
     * 注：Internet Explorer 8 及 更早的浏览器不支持
     * 当指定的音频/视频的元数据已加载完成时触发
     * 兼容性:不同的移动浏览器有不同的触发时间，使用loadedmetadata事件代替canplay事件
     */
    this.audio.addEventListener('loadedmetadata', function () {
        /* 加载歌曲演唱者 */
        _self.element.getElementsByClassName('aplayer-author')[0].innerHTML = ' - ' + _self.music.author;
        /* 启动周期定时器 */
        _self.loadedTime = setInterval(function () {
            /**
             * audio.buffered
             * buffered 属性返回 TimeRanges 对象
             * TimeRanges 对象
             * * 表示用户的音视频缓冲范围
             * * length - 获得音视频中已缓冲范围的数量
             * * start(index) - 获得某个已缓冲范围的开始位置
             * * end(index) - 获得某个已缓冲范围的结束位置
             * 注：首个缓冲范围的下标是 0 
             * percentage 
             *  获取当前音频缓冲范围比
             */
            var percentage = _self.audio.buffered.end(_self.audio.buffered.length - 1) / _self.audio.duration;
            /**
             * 调用updateBar
             * 更新缓冲进度控件
             */
            _self.updateBar.call(_self, 'loaded', percentage, 'width');
            /**
             * 当音频缓冲范围比为 1 时
             * 清空当前周期定时器
             */
            if (percentage === 1) {
                clearInterval(_self.loadedTime);
            }
        }, 500);
    });

    /**
     * 注册 error 事件
     * 当音频加载失败时触发
     */
    this.audio.addEventListener('error', function () {
        /* 更新视图提示加载失败 */
        _self.element.getElementsByClassName('aplayer-author')[0].innerHTML = ' - ' + '加载失败 ╥﹏╥';
    });

    // 播放暂停按钮
    /**
     * playButton 播放按钮
     * pauseButton 暂停按钮
     */
    this.playButton = this.element.getElementsByClassName('aplayer-play')[0];
    this.pauseButton = this.element.getElementsByClassName('aplayer-pause')[0];
    /**
     * 播放、暂停按钮分别注册 click 事件
     * 调用音频控件实例播放、暂停方法
     */
    this.playButton.addEventListener('click', function () {
        _self.play.call(_self);
    });
    this.pauseButton.addEventListener('click', function () {
        _self.pause.call(_self);
    });

    // 控制播放进度
    /**
     * playedBar 播放进度DOM
     * loadedBar 缓冲进度DOM
     * thumb 进度球DOM
     * bar 进度容器DOM
     */
    this.playedBar = this.element.getElementsByClassName('aplayer-played')[0];
    this.loadedBar = this.element.getElementsByClassName('aplayer-loaded')[0];
    this.thumb = this.element.getElementsByClassName('aplayer-thumb')[0];
    this.bar = this.element.getElementsByClassName('aplayer-bar')[0];
    var barWidth;
    /**
     * 进度容器注册 click 事件
     */
    this.bar.addEventListener('click', function (event) {
        /**
         * window.event 
         * 兼容 Internet Explorer
         */
        var e = event || window.event;
        /**
         * 获取进度容器的宽度
         */
        barWidth = _self.bar.clientWidth;
        /**
         * 获取当前播放进度的百分比
         * clientX
         * * 事件触发相对窗口的左偏移量
         * getElementViewLeft(_self.bar)
         * * 获取容器元素相对窗口的偏移量
         */
        var percentage = (e.clientX - getElementViewLeft(_self.bar)) / barWidth;
        /* 按百分比更新播放进度 */
        _self.updateBar.call(_self, 'played', percentage, 'width');
        /* 更新播放时间 */
        _self.element.getElementsByClassName('aplayer-ptime')[0].innerHTML = _self.secondToTime(percentage * _self.audio.duration);
        /* 更新当前播放时间 */
        _self.audio.currentTime = parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration;
        /**
         * 若展示歌词
         * 更新歌词滑动
         */
        if (_self.option.showlrc) {
            _self.updateLrc.call(_self, parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration);
        }
    });
    /**
     * 进度球注册 mousedown 事件
     * 当鼠标按下时触发
     */
    this.thumb.addEventListener('mousedown', function () {
        /* 获取容器宽度 */
        barWidth = _self.bar.clientWidth;
        /* 清除周期定时器 */
        clearInterval(_self.playedTime);
        _self.pause();
        /* 注册鼠标移动事件 */
        document.addEventListener('mousemove', thumbMove);
        /* 注册鼠标弹起事件 */
        document.addEventListener('mouseup', thumbUp);
    });
    /**
     * 鼠标移动事件函数
     * @param {Object} event 事件对象
     */
    function thumbMove(event) {
        /* 兼容：Internet Explorer */
        var e = event || window.event;
        /* 获取当前播放进度的百分比 */
        var percentage = (e.clientX - getElementViewLeft(_self.bar)) / barWidth;
        /**
         * 百分比值校验
         * 防止超出限定值
         */
        percentage = percentage > 0 ? percentage : 0;
        percentage = percentage < 1 ? percentage : 1;
        /* 更新播放进度 */
        _self.updateBar.call(_self, 'played', percentage, 'width');
        /* 更新播放时间 */
        _self.element.getElementsByClassName('aplayer-ptime')[0].innerHTML = _self.secondToTime(percentage * _self.audio.duration);
        /**
         * 若展示歌词
         * 更新歌词滑动
         */
        if (_self.option.showlrc) {
            _self.updateLrc.call(_self, parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration);
        }
    }
    /**
     * 鼠标弹起事件函数
     */
    function thumbUp() {
        /**
         * 分别注销
         * 鼠标弹起
         * 鼠标移动
         * 事件
         */
        document.removeEventListener('mouseup', thumbUp);
        document.removeEventListener('mousemove', thumbMove);
        /**
         * 更新当前播放时间
         */
        _self.audio.currentTime = parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration;
    }


    /* 设置默认音量 */
    this.audio.volume = this.option.volume;
    /**
     * volumeBar 音量控制标识DOM
     * volumeBarWrap 音量控制DOM
     * volumeicon 音量图标DOM
     */
    this.volumeBar = this.element.getElementsByClassName('aplayer-volume')[0];
    var volumeBarWrap = this.element.getElementsByClassName('aplayer-volume-bar')[0];
    var volumeicon = _self.element.getElementsByClassName('aplayer-time')[0].getElementsByTagName('i')[0];
    /**
     * 切换音量图标
     * demo-icon aplayer-icon-volume-up 最高
     * demo-icon aplayer-icon-volume-down 开启
     * demo-icon aplayer-icon-volume-off 关闭
     * 当百分比为1时设为最高
     */
    if (this.option.volume === 1) {
        volumeicon.className = 'demo-icon aplayer-icon-volume-up';
    } else {
        volumeicon.className = 'demo-icon aplayer-icon-volume-down';
    }
    /* 音量的高度  */
    var barHeight = 35;
    /**
     * 音量控制包含元素DOM
     * 注册 click 事件
     */
    this.element.getElementsByClassName('aplayer-volume-bar-wrap')[0].addEventListener('click', function (event) {
        /* 兼容：Internet Explorer */
        var e = event || window.event;
        /* 获取音量的百分比 */
        var percentage = (barHeight - e.clientY + getElementViewTop(volumeBarWrap)) / barHeight;
        /* 校验百分比值 */
        percentage = percentage > 0 ? percentage : 0;
        percentage = percentage < 1 ? percentage : 1;
        /* 更新音量标识高度 */
        _self.updateBar.call(_self, 'volume', percentage, 'height');
        /* 更新播放控件音量 */
        _self.audio.volume = percentage;
        /**
         * muted 是否静音
         * 若是静音状态则开启声音
         */
        if (_self.audio.muted) {
            _self.audio.muted = false;
        }
        /**
         * 切换音量图标
         * demo-icon aplayer-icon-volume-up 最高
         * demo-icon aplayer-icon-volume-down 开启
         * demo-icon aplayer-icon-volume-off 关闭
         * 当百分比为1时设为最高
         */
        if (percentage === 1) {
            volumeicon.className = 'demo-icon aplayer-icon-volume-up';
        } else {
            volumeicon.className = 'demo-icon aplayer-icon-volume-down';
        }
    });
    /**
     * 音量按钮注册 click 事件
     * 切换音频控件是否静音
     * 更新音量标识
     */
    volumeicon.addEventListener('click', function () {
        if (_self.audio.muted) {
            _self.audio.muted = false;
            volumeicon.className = _self.audio.volume === 1 ? 'demo-icon aplayer-icon-volume-up' : 'demo-icon aplayer-icon-volume-down';
            _self.updateBar.call(_self, 'volume', _self.audio.volume, 'height');
        } else {
            _self.audio.muted = true;
            volumeicon.className = 'demo-icon aplayer-icon-volume-off';
            _self.updateBar.call(_self, 'volume', 0, 'height');
        }
    });

    /**
     * 获取元素相对窗口左侧的偏移量
     * @param {Object} element 当前DOM元素 
     */
    function getElementViewLeft(element) {
        var actualLeft = element.offsetLeft;
        var current = element.offsetParent;
        var elementScrollLeft;
        while (current !== null) {
            actualLeft += current.offsetLeft;
            current = current.offsetParent;
        }
        elementScrollLeft = document.body.scrollLeft + document.documentElement.scrollLeft;
        return actualLeft - elementScrollLeft;
    }
    /**
     * 获取元素相对窗口上侧的偏移量
     * @param {Object} element 当前DOM元素 
     */
    function getElementViewTop(element) {
        var actualTop = element.offsetTop;
        var current = element.offsetParent;
        var elementScrollTop;
        while (current !== null) {
            actualTop += current.offsetTop;
            current = current.offsetParent;
        }
        elementScrollTop = document.body.scrollTop + document.documentElement.scrollTop;
        return actualTop - elementScrollTop;
    }

    // 自动播放
    if (this.option.autoplay) {
        this.play();
    }
};

/**
 * 播放方法
 */
APlayer.prototype.play = function () {
    this.playState = true;
    /* 切换播放/暂停按钮样式 */
    this.playButton.classList.add('aplayer-hide');
    this.pauseButton.classList.remove('aplayer-hide');
    /* 播放 */
    this.audio.play();
    var _self = this;
    /**
     * 定时器更新播放进度与歌词滑动
     */
    this.playedTime = setInterval(function () {
        _self.updateBar.call(_self, 'played', _self.audio.currentTime / _self.audio.duration, 'width');
        if (_self.option.showlrc) {
            _self.updateLrc.call(_self);
        }
        _self.element.getElementsByClassName('aplayer-ptime')[0].innerHTML = _self.secondToTime(_self.audio.currentTime);
    }, 100);
    if (this.lrcIndex === 0) {
        moveMusic(this.lrcTime[0] + 0.5, this, null);
    } else {
        var currentWidth = parseInt(document.querySelector('.aplayer-lrc-current>span>span').style.width);
        moveMusic(this.lrcTime[this.lrcIndex + 1] - this.audio.currentTime, this, currentWidth);
    }
};

/**
 * 暂停方法
 */
APlayer.prototype.pause = function () {
    this.playState = false;
    this.pauseButton.classList.add('aplayer-hide');
    this.playButton.classList.remove('aplayer-hide');
    /* 暂停 */
    this.audio.pause();
    /* 清除定时器 */
    clearInterval(this.playedTime);
    clearInterval(this.musicTimer);
};

/**
 * 更新进度条(播放进度条, 加载进度条)
 * @param {String} type 可取值played volume loaded
 * @param {Number} percentage 当前进度占比
 * @param {String} direction 可取值 width height
 */
APlayer.prototype.updateBar = function (type, percentage, direction) {
    /* 校验百分比值 */
    percentage = percentage > 0 ? percentage : 0;
    percentage = percentage < 1 ? percentage : 1;
    /**
     * 百分比转换赋值
     */
    this[type + 'Bar'].style[direction] = percentage * 100 + '%';
};
/**
 * 总时间 time
 * 总长度 length
 * 长度/每秒(length/time) lenPerSec
 * 频率/每秒(1/lenPerSec) frePerSec
 * 毫秒单位转换(frePerSec * 1000)
 * 60秒
 * 120宽
 * 120/60 2/秒
 * 1/2 0.5*1000/毫秒
 */
/**
 * 字幕跟进
 * @param {Number} totalTime 总时间
 * @param {Object} that 播放器实例
 * @param {Number} domWidth 当前歌词的经过长度
 */
function moveMusic(totalTime, that, domWidth) {
    if(!that.playState){ return }
    that.musicTimer && (clearInterval(that.musicTimer), that.musicTimer = null);
    var moveMusicDom = document.querySelector('.aplayer-lrc-current>span>span');
    var staticDom = document.querySelector('.aplayer-lrc-current>span');
    var staticWidth = parseInt(staticDom.offsetWidth);
    /* 总长度 */
    var staticTotalWidth = domWidth ? (staticWidth - domWidth) : staticWidth;
    var frequency = 1 / (staticTotalWidth / totalTime) * 1000;
    function MusicGo() {
        var width = parseInt(moveMusicDom.style.width);
        if (width < staticWidth) {
            moveMusicDom.style.width = (width + 1) + "px";
        } else {
            clearInterval(that.musicTimer);
            that.musicTimer = null;
        }
    }
    moveMusicDom.style.width = domWidth ? domWidth : "0px";
    that.musicTimer = setInterval(MusicGo, frequency);
}

/**
 * 更新lrc滑动
 * @param {Number} currentTime 当前播放时间
 */
APlayer.prototype.updateLrc = function (currentTime) {
    /**
     * 若没有时间
     * 则取音频当前的播放时间
     */
    if (!currentTime) {
        currentTime = this.audio.currentTime;
    }
    /**
     * 若
     *  当前播放时间
     *  小于当前歌词时间
     * 或者
     *  当前播放时间 
     *  大于等于下一歌词时间
     * 时执行
     */
    if (currentTime < this.lrcTime[this.lrcIndex] || currentTime >= this.lrcTime[this.lrcIndex + 1]) {
        /**
         * 循环歌词时间列表
         */
        for (var i = 0; i < this.lrcTime.length; i++) {
            /**
             * 若当前播放时间大于等于当前歌词时间
             * 并且
             * 当前元素为最后一个元素
             * 或者
             * 当前播放时间小于下一个元素时间
             */
            if (currentTime >= this.lrcTime[i] && (!this.lrcTime[i + 1] || currentTime < this.lrcTime[i + 1])) {
                /* 总时间 */
                // var start = this.lrcTime[i];
                var end = this.lrcTime[i + 1];
                if (end === undefined) {
                    end = this.audio.duration
                }
                var len = end - currentTime;
                /* 歌词下标赋值 */
                this.lrcIndex = i;
                /* 移动歌词容器 */
                this.lrcContents.style.transform = 'translateY(' + -this.lrcIndex * this.option.lineHeight + 'px)';
                /* 移除歌词高亮类 */
                this.lrcContents.getElementsByClassName('aplayer-lrc-current')[0].classList.remove('aplayer-lrc-current');
                /* 添加歌词高亮类 */
                this.lrcContents.getElementsByTagName('p')[i].classList.add('aplayer-lrc-current');
                moveMusic(len, this, null);
            }
        }
    }
};

/**
 * 格式化时间
 * @param {Number} second 时间 秒
 */
APlayer.prototype.secondToTime = function (second) {
    var add0 = function (num) {
        return num < 10 ? '0' + num : '' + num;
    };
    var min = parseInt(second / 60);
    var sec = parseInt(second - min * 60);
    return add0(min) + ':' + add0(sec);
};