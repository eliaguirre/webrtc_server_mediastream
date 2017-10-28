
/**
 * 
 * @class Chat
 * 
 * Autor: Ing. Felix Eli by Evolutel
 * 
 */

var Chat = (function () {
    'use strict'
    var Defaults = {
        session: null, //session de opentok que administrar
        debug: true,
    };
    /**
     * 
     * @param {String} id
     * @param {Usuario} usuario
     * @param {Object} { renderIn,session,debug }
     * @returns {chat_L10.Chat@call;init}
     */
    var Chat = function (id, usuario, opt) {
        this.cfg = extend(opt, Defaults);
        return this.init(id, usuario, opt.session);
    };

    Chat.prototype.id = "";

    Chat.prototype.usuario = {};
    Chat.prototype.tipo = {
        texto: "TEXTO",
        archivo: "ARCHIVO",
        imagen: "IMAGEN"
    };

    Chat.prototype.init = function (id, usuario, session) {
        this.id = id;
        this.usuario = usuario;
        var self = this;
        session.on('signal:' + id + 'mensaje_chat', function (event) {
            var datos = JSON.parse(atob(event.data));
            if (datos.usuario.id === self.usuario.id) {
                self.log("Mensaje confirmacion :: " + atob(event.data));
                self.onConfirmSend(datos);
            } else {
                self.log("Mensaje recibido :: " + atob(event.data));
                self.onReceived(datos);
            }
        });

    };

    Chat.prototype.send = function (msj, tipo) {
        var text = {
            tipo: tipo,
            msj: removeTags(msj),
            usuario: {
                id: this.usuario.id,
                nombre: this.usuario.nombre
            }
        };
        if (tipo.toUpperCase() == "TEXTO") {
            text.msj = isURL(text.msj)
        }
        var self = this;
        if (text.msj != "") {
            self.cfg.session.signal({
                type: self.id + 'mensaje_chat',
                data: btoa(JSON.stringify(text))
            },
            function (error) {
                if (error) {
                    self.onError({tipo: "send", data: text});
                    self.log("ERROR :: " + JSON.stringify(text));
                } else {
                    self.onSend(text);
                    self.log("Mensaje enviado :: " + JSON.stringify(text));
                }
            });
        } else {
            self.log("El msj esta vacio");
        }
    };


    /*<<<<<<<<<<<<<<<<<<<LOGGER>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
    Chat.prototype.log = function (msj) {
        if (this.cfg.debug)
            console.log(new Date(), msj);
    };


    /*<<<<<<<<<<<<<<<<<<<Eventos>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>*/
    Chat.prototype.onSend = function (text) {

    };

    Chat.prototype.onConfirmSend = function () {

    };

    Chat.prototype.onReceived = function () {

    };

    Chat.prototype.onError = function () {

    }


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

    var isURL = function (texto_mensj) {
        texto_mensj = texto_mensj.toLowerCase();
        if (texto_mensj.indexOf("img") != -1 || texto_mensj.indexOf("download") != -1) {
            return texto_mensj;
        }
        if (texto_mensj.indexOf('www.') >= 0 && texto_mensj.indexOf('http') <= 0) {
            if (texto_mensj.indexOf('www.') == 0)
                texto_mensj = 'http://' + texto_mensj;
            else {
                var i = texto_mensj.indexOf('www.');
                var t = texto_mensj.length;
                texto_mensj = texto_mensj.substring(0, i) + 'http://' + texto_mensj.substring(i, t);
            }
        }
        var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return texto_mensj.replace(exp, "<a target='_blank' href='$1'>$1</a>");
    }

    var removeTags = function (txt) {
        var rex = /(<([^>]+)>)/ig;
        return (txt.replace(rex, ""));
    }



    return Chat;
})();






var ChatComunica = (function () {
    'use strict'
    var Defaults = {
        template_sent: '<div class="message message-sent message-appear-from-bottom message-last message-with-tail message-first"><div class="message-text"  style="">[[MENSAJE]]</div> <div class="message-label">[[ESTADO]]</div></div>',
        template_received: '<div class="message message-received message-with-avatar message-last message-with-tail message-first">' +
                '<div class="message-name">[[USUARIO]]</div>' +
                '<div class="message-text" style="">[[MENSAJE]]</div>' +
                '<div style="background-image:url([[URL_PERFIL]])" class="message-avatar"></div>' +
                '</div>',
        id: '',
        debug: true,
        class_hide: "chat-hide",
        content: "chat_window_1",
        colors: {
            sent: "#0063A2",
            font_sent: "white",
            received: "#87B62D",
            font_received: "black",
        }
    };

    var ChatComunica = function (chat, div, opt) {
        this.chat = chat;
        if (typeof div == "string") {
            this.container = document.getElementById(div);
        } else {
            this.container = div;
        }
        this.config = extend(opt,Defaults);
        
        this.init(chat, div);
        console.log(opt)
        console.log(this.config)
    }

    ChatComunica.prototype.chat;
    ChatComunica.prototype.id = "";
    ChatComunica.prototype.mensaje_sin_leer = 0;

    ChatComunica.prototype.init = function (chat, container) {
        var self = this;
        chat.onConfirmSend = function (data) {
            var temp = self.config.template_sent;
            switch (data.tipo.toUpperCase()) {
                case "IMAGEN":
                    data.msj = "<img src='" + data.msj + "'>"
                    break;
                case "ARCHIVO":
                    data.msj = "<a download href='" + data.msj + "'><i class='fa fa-file'></i> ARCHIVO</a>"
                    break;
            }
            temp = temp.replace("[[MENSAJE]]", data.msj);
            temp = temp.replace("[[ESTADO]]", "enviado");
            var div = document.createElement("div")
            div.innerHTML = temp;
            div.setAttribute("class", "sent");
            switch (data.tipo.toUpperCase()) {
                case "IMAGEN":
                    var e = div.getElementsByClassName("message")[0];
                    var clas = e.getAttribute("class");
                    e.setAttribute("class", clas + " message-pic");
                    break;
            }
            var e = div.getElementsByClassName("message-text")[0];
            e.setAttribute("style","color: "+self.config.colors.font_sent+";background: "+self.config.colors.sent);
            self.container.appendChild(div);
            self.container.scrollTop = self.container.scrollHeight;
        };

        chat.onReceived = function (data) {
            switch (data.tipo.toUpperCase()) {
                case "IMAGEN":
                    data.msj = "<img src='" + data.msj + "'>"
                    break;
                case "ARCHIVO":
                    data.msj = "<a download href='" + data.msj + "'><i class='fa fa-file'></i> ARCHIVO</a>"
                    break;
            }
            var temp = self.config.template_received;
            temp = temp.replace("[[MENSAJE]]", data.msj);
            temp = temp.replace("[[USUARIO]]", data.usuario.nombre);
            temp = temp.replace("[[URL_PERFIL]]", config.server + "/perfil/foto/" + data.usuario.id + "?tam=small");
            var div = document.createElement("div");
            div.innerHTML = temp;
            div.setAttribute("class", "received");
            switch (data.tipo.toUpperCase()) {
                case "IMAGEN":
                    var e = div.getElementsByClassName("message")[0];
                    var clas = e.getAttribute("class");
                    e.setAttribute("class", clas + " message-pic");
                    break;
            }
            if (!self.isVisible()) {
                self.onNotification();
            }
            var e = div.getElementsByClassName("message-text")[0];
            e.setAttribute("style","color: "+self.config.colors.font_received+";background: "+self.config.colors.received);
            self.container.appendChild(div);
            self.container.scrollTop = self.container.scrollHeight;
        };
    };

    ChatComunica.prototype.isVisible = function () {
        var clas = document.getElementById(this.config.content).getAttribute("class");
        var chatActive = clas.indexOf(this.config.class_hide) == -1;
        return chatActive;
    };

    ChatComunica.prototype.onNotification = function () {
        var badge = document.getElementById(this.id + 'badge');
        var badgeNum;
        var badgeChild = badge.children[0];
        if (badgeChild.className === 'badge-num')
            badge.removeChild(badge.children[0]);
        badgeNum = document.createElement('div');
        badgeNum.setAttribute('class', 'badge-num');
        badgeNum.innerHTML = ++this.mensaje_sin_leer;
        badge.insertBefore(badgeNum, badge.firstChild);
    };

    ChatComunica.prototype.clearNotification = function () {
        this.mensaje_sin_leer = 0;
        var badge = document.getElementById(this.id + 'badge');
        var badgeChild = badge.children[0];
        if (badgeChild.className === 'badge-num')
            badge.removeChild(badge.children[0]);
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

    return ChatComunica;
})()