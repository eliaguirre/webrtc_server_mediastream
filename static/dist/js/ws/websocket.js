



var WebSocketMQTT=(function(){
    'use strict'
    var Defaults = {
        session: null, 
        debug: true,
        clientId: "clientId"
    };

    //"172.17.0.22", 3000, "clientId"
    var WebSocketMQTT = function (server, port, opt) {
        console.log("SERVER",server)
        console.log("PORT",port)
        this.cfg = extend(opt, Defaults);
        return this.init(server, port);
    };

    WebSocketMQTT.prototype.client=null;
    WebSocketMQTT.prototype.server=null;
    WebSocketMQTT.prototype.port=null;
    WebSocketMQTT.prototype.endPoint=null;
    WebSocketMQTT.prototype.events={},
    WebSocketMQTT.prototype.subscripciones={},

    WebSocketMQTT.prototype.init = function (server,port) {
       this.client = new Paho.MQTT.Client(server, port,"web_"+guid());
       var self=this;
       this.client.onConnectionLost = function(responseObject){
                if (responseObject.errorCode !== 0) {
                        console.log("onConnectionLost:" + responseObject.errorMessage);
                        self.onDisconnect();
                    }
       };
       this.client.onMessageArrived = function(message){
        self.handler(message);
       }
    };

    WebSocketMQTT.prototype.connect=function(){
        var self=this;
        this.client.connect({onSuccess: function(){
            self.log("onConnect","connect");
            self.onConnect();
        }});
    }

    WebSocketMQTT.prototype.subscribe=function(endPoint){
        this.log("subscribe",endPoint) 
        this.endPoint=endPoint;
        this.client.subscribe(endPoint);
    }

    WebSocketMQTT.prototype.signal=function(data){
        var message = new Paho.MQTT.Message(JSON.stringify(data));
        message.destinationName = this.endPoint;
        this.client.send(message); 
    }

    WebSocketMQTT.prototype.handler=function (frame) {
        var obj = JSON.parse(frame.payloadString);
        if (typeof this.events[obj.type] === 'function') {
            this.log("EJECUTANDO "+ obj.type,obj.data)
            try{
                this.events[obj.type](obj.data);
            }catch(e){
                console.log(e)
            }
        }
    }
    //LOGGER
    WebSocketMQTT.prototype.log=function(tipo,msj){
        if(this.cfg.debug){
            console.log(tipo,msj);
        }
    }
    // E V E N T O S
    WebSocketMQTT.prototype.onConnect=function(){
        
    };
    WebSocketMQTT.prototype.onDisconnect=function(){
        console.log("onDisconnect")
        console.log(this);
        //this.log("onDisconnect","Desconectado");
    };
    WebSocketMQTT.prototype.onSignal=function (type, fn) {
        this.events[type] = fn;
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
    return WebSocketMQTT;
})();


/*
var SubscribeMQTT=(function(){
    'use strict'
    var Defaults = {
        debug: true,
    };

    SubscribeMQTT.prototype.enPoint=null;
    SubscribeMQTT.prototype.client=null;



    var SubscribeMQTT=function(enPoint,client,opt){
        this.enPoint=enPoint;
        this.client=client;
        this.cfg = extend(opt, Defaults);
        this.client.subscribe(endPoint);
    }



    //LOGGER
    SubscribeMQTT.prototype.log=function(tipo,msj){
        if(this.cfg.debug){
            console.log("SUSCRIBE",tipo,msj);
        }
    }



    var extend = function (toObj, fromObj) {
        toObj = toObj || {};
        Object.keys(fromObj).forEach(function (key) {
            if (!(key in toObj)) {
                toObj[key] = fromObj[key];
            }
        });
        return toObj;
    };
    return SubscribeMQTT;
})()


*/




function guid() {
        function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
        }
        return s4() + s4() + '' + s4() + '' + s4() + '' +
                s4() + '' + s4() + s4() + s4();
    }






