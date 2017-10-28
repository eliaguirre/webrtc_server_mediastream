var isMozilla = window.mozRTCPeerConnection && !window.webkitRTCPeerConnection;
if (isMozilla) {
    window.webkitURL = window.URL;
    navigator.webkitGetUserMedia = navigator.mozGetUserMedia;
    window.webkitRTCPeerConnection = window.mozRTCPeerConnection;
    window.RTCSessionDescription = window.mozRTCSessionDescription;
    window.RTCIceCandidate = window.mozRTCIceCandidate;
}

var selfView;
var remoteView;
var callButton;
var audioCheckBox;
var videoCheckBox;
var audioOnlyView;
var signalingChannel;
var pc;
var peer;
var localStream;
var chatDiv;
var chatText;
var chatButton;
var chatCheckBox;
var channel;
var peers = new Peers();

if (!window.SDP) {
    console.error("+-------------------------WARNING-------------------------+");
    console.error("| sdp.js not found, will not transform signaling messages |");
    console.error("+---------------------------------------------------------+");
    window.SDP = {"parse": function () {}, "generate": function () {}};
}

if (!window.hasOwnProperty("orientation"))
    window.orientation = -90;

// must use 'url' here since Firefox doesn't understand 'urls'
var configuration = {
    "iceServers": [
        {
            "url": "stun:mmt-stun.verkstad.net"
        },
        {
            "url": "turn:mmt-turn.verkstad.net",
            "username": "webrtc",
            "credential": "secret"
        }
    ]
};
window.onload = function () {
    selfView = document.getElementById("self_view");
};




function join_conference() {
    //audioCheckBox.disabled = videoCheckBox.disabled = chatCheckBox.disabled = joinButton.disabled = true;
    if (!(true || true))
        peerJoin();
    function peerJoin() {
        console.log("PERR JOIN ")
        var sessionId = document.getElementById("session_txt").value;
        console.log("session", sessionId);
        signalingChannel = new SignalingChannel(sessionId);
        // show and update share link        
        signalingChannel.onpeer = function (evt) {
            console.log("Signaling channel ")
            var peer = evt.peer;
            peer.onmessage = handleMessage;
            peer.ondisconnect = function () {
                if (pc)
                    pc.close();
                pc = null;
            };
            peers.add(peer);
            setTimeout(function () {
                if (typeof init_conference === "function")
                    init_conference(true);
            }, 2000)
        };
    }
    if (true || true) {
        navigator.webkitGetUserMedia({"audio": true,
            "video": true}, function (stream) {
            selfView.src = URL.createObjectURL(stream);
            localStream = stream;
            peerJoin();
        }, logError);
    }
}

// handle signaling messages received from the other peer
function handleMessage(evt) {
    var message = JSON.parse(evt.data);

    if (!pc && (message.sessionDescription || message.sdp || message.candidate))
        start(false);

    if (message.sessionDescription || message.sdp) {
        var desc = new RTCSessionDescription({
            "sdp": SDP.generate(message.sessionDescription) || message.sdp,
            "type": message.type
        });
        pc.setRemoteDescription(desc, function () {
            if (pc.remoteDescription.type == "offer")
                pc.createAnswer(localDescCreated, logError);
        }, logError);
    }else {
        var d = message.candidate.candidateDescription;
        if (d && !message.candidate.candidate) {
            message.candidate.candidate = "candidate:" + [
                d.foundation,
                d.componentId,
                d.transport,
                d.priority,
                d.address,
                d.port,
                "typ",
                d.type,
                d.relatedAddress && ("raddr " + d.relatedAddress),
                d.relatedPort && ("rport " + d.relatedPort),
                d.tcpType && ("tcptype " + d.tcpType)
            ].filter(function (x) {
                return x;
            }).join(" ");
        }
        pc.addIceCandidate(new RTCIceCandidate(message.candidate), function () {}, logError);
    }
}

// call start() to initiate
function start(isInitiator) {
//    callButton.disabled = true;
    pc = new webkitRTCPeerConnection(configuration);

    // send any ice candidates to the other peer
    pc.onicecandidate = function (evt) {
        if (evt.candidate) {
            var candidate = "";
            var s = SDP.parse("m=application 0 NONE\r\na=" + evt.candidate.candidate + "\r\n");
            var candidateDescription = s && s.mediaDescriptions[0].ice.candidates[0];
            if (!candidateDescription)
                candidate = evt.candidate.candidate;
            peers.send(JSON.stringify({
                "candidate": {
                    "candidate": candidate,
                    "candidateDescription": candidateDescription,
                    "sdpMLineIndex": evt.candidate.sdpMLineIndex
                }
            }));
            console.log("candidate emitted: " + evt.candidate.candidate);
        }
    };

    pc.onnegotiationneeded = function () {
        if (pc.signalingState == "stable" && !isMozilla || isInitiator)
            pc.createOffer(localDescCreated, logError);
    };

    // start the chat
    if (isInitiator) {
        channel = pc.createDataChannel("chat");
        // setupChat();
    } else {
        pc.ondatachannel = function (evt) {
            channel = evt.channel;
            // setupChat();
        };
    }

    // once the remote stream arrives, show it in the remote video element
    pc.onaddstream = function (evt) {
        var remoteView = document.createElement("video");
        remoteView.src = URL.createObjectURL(evt.stream);
        remoteView.setAttribute("muted", "true");
        $(".otros").append(remoteView);
        sendOrientationUpdate();
    };
    pc.addStream(localStream);
}

function localDescCreated(desc) {
    pc.setLocalDescription(desc, function () {
        var sdp = "";
        var sessionDescription = SDP.parse(pc.localDescription.sdp);
        if (!sessionDescription)
            sdp = pc.localDescription.sdp;
        peers.send(JSON.stringify({
            "sdp": sdp,
            "sessionDescription": sessionDescription,
            "type": pc.localDescription.type
        }));
        var logMessage = "localDescription set and sent to peer, type: " + pc.localDescription.type;
        if (sdp)
            logMessage += ", sdp:\n" + sdp;
        if (sessionDescription)
            logMessage += ", sessionDescription:\n" + JSON.stringify(sessionDescription, null, 2);
        console.log(logMessage);
    }, logError);
}

function sendOrientationUpdate() {
    peers.send(JSON.stringify({"orientation": window.orientation + 90}));
}

window.onorientationchange = function () {
    if (peers)
        sendOrientationUpdate();
    if (selfView) {
        var transform = "rotate(" + (window.orientation + 90) + "deg)";
        selfView.style.transform = selfView.style.webkitTransform = transform;
    }
};

function logError(error) {
    if (error) {
        if (error.name && error.message)
            log(error.name + ": " + error.message);
        else
            log(error);
    } else
        log("Error (no error message)");
}

function log(msg) {
    console.log(msg)
//    log.div = log.div || document.getElementById("log_div");
//    log.div.appendChild(document.createTextNode(msg));
//    log.div.appendChild(document.createElement("br"));
}

// setup chat
function setupChat() {
    channel.onopen = function () {
        chatDiv.style.visibility = "visible";
        chatText.style.visibility = "visible";
        chatButton.style.visibility = "visible";
        chatButton.disabled = false;

        //On enter press - send text message.
        chatText.onkeyup = function (event) {
            if (event.keyCode == 13) {
                chatButton.click();
            }
        };

        chatButton.onclick = function () {
            if (chatText.value) {
                postChatMessage(chatText.value, true);
                channel.send(chatText.value);
                chatText.value = "";
                chatText.placeholder = "";
            }
        };
    };

    // recieve data from remote user
    channel.onmessage = function (evt) {
        postChatMessage(evt.data);
    };

    function postChatMessage(msg, author) {
        var messageNode = document.createElement('div');
        var messageContent = document.createElement('div');
        messageNode.classList.add('chatMessage');
        messageContent.textContent = msg;
        messageNode.appendChild(messageContent);

        if (author) {
            messageNode.classList.add('selfMessage');
        } else {
            messageNode.classList.add('remoteMessage');
        }

        chatDiv.appendChild(messageNode);
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }
}
