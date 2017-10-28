

/**
 * 
 * @class Moderador
 * 
 * Autor: Ing. Felix Eli by Evolutel
 * 
 */

var Moderador = (function () {
    'use strict'

    var Defaults = {
        session: null, //session de opentok que administrar
        debug: true,
    };

    var Moderador = function (opt) {
        this.cfg = extend(opt, Defaults);
        return this.init(opt.session);
    };

    Moderador.prototype.usuarios = {};
    Moderador.prototype.statuses = {CONNECT: 1, AUSENTE: 2, DISCONNECT: 0};
    Moderador.prototype.session = null;
    Moderador.prototype.init = function (session) {
        this.session = session;
        var self = this;
        this.session.on({
            "signal:mensaje_desconectado": function (event) {
                self.log("mensaje desconectado")
            },
            "signal:session_disconnect": function (evt) {
                session.disconnect();
            },
            sessionConnected: function (event) {
                self.log("conectado....");
                try {
                    self.onConnected(event);
                } catch (e) {
                    self.log("ERROR ::: EVENT ON CONNECTED");
                }
            },
            streamDestroyed: function (event) {
                self.log("destruido");
                self.log(event);
            },
            sessionDisconnected: function (evt) {
                self.log("desconectado");
                self.log(evt);
            },
            streamCreated: function (event) {
                var streams = event.streams;
                for (var i = 0; i < streams.length; i++) {
                    self.log("nuevo stream");
                    self.log(streams[i].streamId)
                }
            },
            "signal:session_status": function (evt) {
                var datos = JSON.parse(evt.data);
                if (self.usuarios[datos.usuario.id]) {
                    if (self.usuarios[datos.usuario.id].estado != datos.usuario.estado) {
                        try {
                            self.onChangeUserStatus(datos);
                        } catch (e) {
                            self.log("ERROR ::: EVENT ON CHANGE USER")
                        }
                        self.log("change user status " + JSON.stringify(datos));
                    }
                    self.usuarios[datos.usuario.id].estado = datos.usuario.estado;
                } else {
                    self.usuarios[datos.usuario.id] = datos.usuario;
                    try {
                        self.onNewUser(datos);
                        self.onChangeUserStatus(datos);
                    } catch (e) {
                        self.log("ERROR ::: EVENT ON NEW USER")
                    }
                    self.log("change user status " + JSON.stringify(datos));
                }
                if (datos.status === 1) {
                    self.signalStatusUsuario(self.usuarios[datos.usuario.id], "tu estado");
                }
            },
            "signal:admin_status": function (evt) {
                var datos = JSON.parse(evt.data);
                try {
                    switch (datos.status) {
                        case -1:
                            self.usuarios[datos.usuario.id].video = -1;
                            self.onChangeVideo({status: datos.status, usuario: self.usuarios[datos.usuario.id]});
                            break;
                        case 1:
                            self.usuarios[datos.usuario.id].video = 1;
                            self.onChangeVideo({status: datos.status, usuario: self.usuarios[datos.usuario.id]});
                            break;
                        case -2:
                            self.usuarios[datos.usuario.id].audio = -2;
                            self.onChangeAudio({status: datos.status, usuario: self.usuarios[datos.usuario.id]});
                            break;
                        case 2:
                            self.usuarios[datos.usuario.id].audio = 2;
                            self.onChangeAudio({status: datos.status, usuario: self.usuarios[datos.usuario.id]});
                            break;
                        case -3:
                            self.usuarios[datos.usuario.id].activo = -3;
                            self.onChangeConexion({status: datos.status, usuario: self.usuarios[datos.usuario.id]});
                            break;
                        case 3:
                            self.usuarios[datos.usuario.id].activo = 3;
                            self.onChangeConexion({status: datos.status, usuario: self.usuarios[datos.usuario.id]});
                            break;
                        case 4:
                            break;
                    }
                } catch (e) {
                    self.log("ERROR ::: EVENT ON CHANGE");
                }
                self.log("change user status " + JSON.stringify({status: datos.status, usuario: self.usuarios[datos.usuario.id]}));
            }
        });
    };

    Moderador.prototype.adminStatus = function (id, s, msj) {
        var text = {msj: msj, status: s, usuario: {id: id}};
        var self = this;
        this.session.signal({
            type: 'admin_status',
            data: JSON.stringify(text)
        },
        function (error) {
            if (error)
                self.onError("Error enviando status");
        });
    };


    Moderador.prototype.signalStatusUsuario = function (usuario, msj) {
        var text = {msj: msj, usuario: usuario};
        var self = this;
        this.session.signal({
            type: 'status_usuario',
            data: JSON.stringify(text)
        },
        function (error) {
            if (error)
                self.onError("Error enviando status");
        });
    };


    Moderador.prototype.toggleAudio = function (id) {
        this.usuarios[id].audio = this.usuarios[id].audio ? this.usuarios[id].audio : 2;
        if (this.usuarios[id].audio == -2) {
            this.adminStatus(id, 2);
        } else {
            this.adminStatus(id, -2);
        }
    };


    Moderador.prototype.toggleVideo = function (id) {
        this.usuarios[id].video = this.usuarios[id].video ? this.usuarios[id].video : 1;
        if (this.usuarios[id].video == -1) {
            this.adminStatus(id, 1);
        } else {
            this.adminStatus(id, -1);
        }
    };

    Moderador.prototype.toggleConexion = function (id) {
        this.usuarios[id].activo = this.usuarios[id].activo ? this.usuarios[id].activo : 3;
        if (this.usuarios[id].activo == -3) {
            this.adminStatus(id, 3);
        } else {
            this.adminStatus(id, -3);
        }
    };

    Moderador.prototype.finish = function () {
        this.session.signal({
            type: 'session_disconnect',
            data: "disconnect"
        },
        function (error) {
            if (!error) {
                window.onunload = null;
                window.onbeforeunload = null;
                location.href = config.server + "/sala_terminar/" + config.sala.id;
            }
        });
    };

    Moderador.prototype.sendInvitation = function (opt) {
        var self = this;
        $.ajax({
            url: opt.server + "/sala/invitar",
            data: "tipo=" + opt.user.tipo + "&correo=" + opt.user.correo,
            method: "POST",
            statusCode: {
                406: function () {
                    opt.limitExcedido();
                    self.log("limite excedido");
                }
            },
            success: function () {
                opt.success();
                $("#input-model-email").val("");
                self.log("Invitacion enviada");
            },
            error: function () {
                opt.error();
                self.log("Error al enviar invitacion");
            }
        });
    };

    /*<<<<<<<<<<<<<<<<<<<LOGGER>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
    Moderador.prototype.log = function (msj) {
        if (this.cfg.debug)
            console.log(new Date(), msj);
    };


    /*<<<<<<<<<<<<<<<<<<<Eventos>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
    Moderador.prototype.onError = function (msj) {
        if (this.cfg.debug) {
            console.log(new Date(), msj);
        }
    };

    Moderador.prototype.onChangeUserStatus = function (data) {
        if (this.cfg.debug) {
            console.log(new Date(), data);
        }
    };

    Moderador.prototype.onChangeAudio = function (data) {
        if (this.cfg.debug) {
            console.log(new Date(), data);
        }
    };

    Moderador.prototype.onChangeVideo = function (data) {
        if (this.cfg.debug) {
            console.log(new Date(), data);
        }
    };

    Moderador.prototype.onConnected = function (evt) {
        console.log(evt)
    };

    Moderador.prototype.onChangeConexion = function (data) {
        if (this.cfg.debug) {
            console.log(new Date(), data);
        }
    };


    Moderador.prototype.onNewUser = function (data) {
        if (this.cfg.debug) {
            console.log(new Date(), data);
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

    return Moderador;

})();


