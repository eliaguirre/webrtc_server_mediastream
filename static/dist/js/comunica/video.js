var Video = (function () {
    'use strict'
    var publisherProperties = {'height': "100%", 'width': "100%", audioFallbackEnabled: true, "fitMode": "contain", style: {audioLevelDisplayMode: "on"}};//publisher cam
    var myPublishProperties = {'height': "100%", 'width': "100%", audioFallbackEnabled: true, "fitMode": "contain", style: {audioLevelDisplayMode: "on"}};//publisher cam
    var screenProperties = {'height': "100%", 'width': "100%", frameRate: 7, "fitMode": "contain", videoSource: 'screen'};//share screen
    var extension = "hnahjooaaabflojedjonlpjigekmidao"; //el real
//    var extension = "goficajmmmjgglcamlledmhmefdeofdo";
    var session = {}

    var Defaults = {
        session: null, //session de opentok que administrar
        debug: true,
        screenActive: false,
    };

    var Video = function (usuario, opt) {
        this.cfg = extend(opt, Defaults);
        this.usuario = usuario;
        session = opt.session;
        this.init(usuario, opt)
    };


    Video.prototype.usuario = {};
    Video.prototype.usuarios = {}

    Video.prototype.init = function (usuario, opt) {
        myPublishProperties.name = usuario.name;
        OT.registerScreenSharingExtension('chrome', extension);
        var self = this;
        window.onunload = function (e) {
            this.signal_status(0, "desconectado");
        };
        var focus = true;
        var inter = null;
        window.onfocus = function () {
            focus = true;
            signal_status(1, "Conectado");
        };
        window.onblur = function () {
            focus = false;
            clearInterval(inter)
            inter = setInterval(function () {
                if (!focus) {
                    signal_status(2, "ausente");
                }
            }, 10000);
        };
        session.on({
            "signal:mensaje_desconectado": function (event) {
                self.onChangeUsuario();
            },
            "signal:session_disconnect": function (evt) {
                self.onSignalDisconnect();
            },
            sessionConnected: function (event) {
                if (self.usuario.isPublish) {
                    self.publisher = self.onConnect(myPublishProperties);
                }
                self.signal_status(1, "conectado");
            },
            streamDestroyed: function (event) {
                self.onStreamDestroyed
            },
            sessionDisconnected: function (evt) {
                signal_status(0, "desconectado");
                self.onDisconnected(evt);
            },
            streamCreated: function (event) {
                var streams = event.streams;
                for (var i = 0; i < streams.length; i++) {
                    self.onStreamCreated(streams[i], publisherProperties);
                }
            },
            "signal:session_status": function (evt) {
                var datos = JSON.parse(evt.data);
                if (self.usuarios[datos.usuario.id]) {
                    self.usuarios[datos.usuario.id].estado = datos.usuario.estado;
                    self.onChangeUsuario(datos);
                } else {
                    self.usuarios[datos.usuario.id] = datos.usuario;
                    self.onNewUsuario(datos);
                }
            },
            "signal:admin_status": function (evt) {
                var datos = JSON.parse(evt.data);
                if (self.usuario.id == datos.usuario.id) {
                    switch (datos.status) {
                        case -1:
                            self.publisher.publishVideo(false);
                            self.onChangeVideo(datos);
                            break;
                        case 1:
                            self.publisher.publishVideo(true);
                            self.onChangeVideo(datos);
                            break;
                        case -2:
                            self.publisher.publishAudio(false);
                            self.onChangeAudio(datos);
                            break;
                        case 2:
                            self.publisher.publishAudio(true);
                            self.onChangeVideo(datos);
                            break;
                        case -3:
                            self.publisher.destroy();
                            self.publisher = null;
                            self.signal_status(0, "Desconectado");
                            self.onDisconnect(datos);
                            break;
                        case 3:
                            self.signal_status(1, "Conectado");
                            if (self.usuario.isPublish && self.publisher === null) {
                                self.publisher = onConnect(myPublishProperties);
                            }
                            break;
                    }

                }
                switch (datos.status) {
                    case -1:
                        self.usuarios[datos.usuario.id].video = -1;
                        self.onChangeUsuarioVideo(datos);
                        break;
                    case 1:
                        usuarios[datos.usuario.id].video = 1;
                        self.onChangeUsuarioVideo(datos);
                        break;
                    case -2:
                        usuarios[datos.usuario.id].audio = -2;
                        self.onChangeUsuarioAudio(datos);
                        break;
                    case 2:
                        usuarios[datos.usuario.id].audio = 2;
                        self.onChangeUsuarioAudio(datos);
                        break;
                    case -3:
                        usuarios[datos.usuario.id].activo = -3;
                        self.onChangeUsuarioConnect(datos);
                        break;
                    case 3:
                        usuarios[datos.usuario.id].activo = 3;
                        self.onChangeUsuarioConnect(datos);
                        break;
                    case 4:
                        break;
                }
                self.onChangeUsuario(datos);
            }
        });



    };

    Video.prototype.connect = function (token, velocity) {
        if (velocity > 400) {
            publisherProperties.frameRate = 15;
            publisherProperties.resolution = "640x480";
            myPublishProperties.frameRate = 15;
            myPublishProperties.resolution = "640x480";
        } else if (velocity > 50) {
            publisherProperties.frameRate = 7;
            publisherProperties.resolution = "320x240";
            myPublishProperties.frameRate = 7;
            myPublishProperties.resolution = "320x240";
        } else {
            publisherProperties.frameRate = 1;
            publisherProperties.publishAudio = true;
            publisherProperties.publishVideo = false;
            publisherProperties.resolution = "320x240";
            myPublishProperties.frameRate = 1;
            myPublishProperties.publishAudio = true;
            myPublishProperties.publishVideo = false;
            myPublishProperties.resolution = "320x240";
        }
        session.connect(token);
    };

    Video.prototype.extensionInstalled = function () {
        var ext = $("#" + extension);
        if (ext.get(0)) {
            return true;
        }
        return false;
    }


    Video.prototype.shareDesktop = function (div, onSuccess, onError) {
        var self = this;
        if (!this.cfg.screenActive) {
            OT.checkScreenSharingCapability(function (response) {
                if (!response.supported || (!response.extensionInstalled && response.extensionInstalled != undefined)) {
                    onError();
                } else {
                    var publisher = OT.initPublisher(div,
                            screenProperties,
                            function (error) {
                                if (error) {
                                    onError();
                                } else {
                                    self.cfg.screenActive = publisher;
                                    session.publish(publisher, function (error) {
                                        if (error) {
                                            onError();
                                        }
                                    });
                                    onSuccess(publisher);
                                }
                            }
                    );
                }
            });
        } else {
            this.cfg.screenActive.destroy();
            this.cfg.screenActive = false;
            this.shareDesktop(div, onSuccess, onError);
        }
    };

    Video.prototype.publish=function(apiKey,div){
        var publisher = OT.initPublisher(apiKey, div, myPublishProperties);
        session.publish(publisher);
    };

    Video.prototype.signal_status = function (status, msj) {
        if (this.usuario.estado != 0 || (this.usuario.estado == 0 && status == 1)) {
            var text = {msj: msj,status: status,usuario: { id: this.usuarioid, nombre: this.usuario.nombre,isPublish: this.usuario.isPublish,estado: status}};
            this.usuario.estado = status;
            session.signal({type: 'session_status',data: JSON.stringify(text)},function (error) {});
        }
    };

    Video.prototype.toggleFullScreen = function (elem, onFullScreen, onExitFullScreen) {
        function evento() {
            if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                onExitFullScreen();
            } else {
                onFullScreen();
            }
        }
        if (document.addEventListener) {
            document.addEventListener('webkitfullscreenchange', evento, false);
            document.addEventListener('mozfullscreenchange', evento, false);
            document.addEventListener('fullscreenchange', evento, false);
            document.addEventListener('MSFullscreenChange', evento, false);
        }
        if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {  // current working methods
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    };



    /*<<<<<<<<<<<<<<<<<<<Utils>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
    var extend = function (toObj, fromObj) {
        toObj = toObj || {};
        Object.keys(fromObj).forEach(function (key) {
            if (!(key in toObj)) {
                toObj[key] = fromObj[key];
            }
        });
        return toObj;
    };

    return Video;

})()