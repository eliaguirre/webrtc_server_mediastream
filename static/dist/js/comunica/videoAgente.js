function notificacion() {
    if (!checkPermission()) {
        $("#btn-modal-activar-notificaciones").click(function () {
            requestPermission();
        });
        $("#modal-activar-notificaciones").modal("show");
    }
}

$(document).ready(function () {
    var con = new EvoWebSocket();
    tickets = Array();
    sub = new Object();
    sub2 = new Object();
    con.onConnect = function (id) {
        sub = con.subscribe('/topic/' + config.topic + '/ticket');
        busqueda(false);
        sub.onSignal("connect", function (data) {
            newNotification(data.nombre, data.mensaje).show();
            tickets.push(data);
            $("#container-tickets").append('<a id="' + data.id + '" data-toggle="popover" data-content="' + data.mensaje + '" class="list-group-item">' + data.nombre + '<span class="badge badge-default">&nbsp</span></a>');
            $("#container-tickets #" + data.id).popover({trigger: "hover", html: true, title: "mensaje"});

        });
        sub.onSignal("encontrado", function (data) {
            cola.push(data);
        });
        sub2 = con.subscribe('/topic/agent-' + config.server + '/ticket');
        sub2.onSignal("siguiente-agente", function (data) {
            if (data.id == yo.nombre) {
                //console.log("es mio");
            } else {
                $("#container-tickets").get(0).removeChild($("#container-tickets a#" + data.next).get(0));
            }
        });
    };
    con.connect("/ticket", {});
    $("#btn-terminar-atencion").click(function () {
        session.signal({
            type: 'terminarAtencion',
            data: JSON.stringify(yo)},
        function (error) {
            try {
                usuarios[0] = null;
                $("#container-usuarios").get(0).removeChild($("#auditores a#0").get(0));
            } catch (e) {
            }
            busqueda(true);
        });
    });
});


function busqueda(atender) {
    cola = Array();
    sub.signal({
        type: "busqueda",
        data: {
            id: yo.id,
            empresa: config.topic,
            agente: yo.id
        }
    });
    setTimeout(function () {
        var viejo = {nombre: '', esperando: 0};
        for (var i = 0; i < cola.length; i++) {
            var t = cola[i];
            if (viejo.esperando < t.esperando) {
                viejo = t;
            }
            var temp = $("#container-tickets #" + t.id);
            if (temp.length === 0) {
                $("#container-tickets").append('<a id="' + t.id + '" data-toggle="popover" data-content="' + t.mensaje + '" class="list-group-item">' + t.nombre + '<span class="badge badge-default">&nbsp</span></a>');
                $("#container-tickets #" + t.id).popover({trigger: "hover", html: true, title: "mensaje"});
            }
        }
        if (atender === true) {
            sub.signal({
                type: "siguiente",
                data: {
                    id: yo.nombre,
                    "empresa": config.topic,
                    "agente": yo.id,
                    "next": viejo.id
                }
            });
            sub2.signal({
                type: "siguiente-agente",
                data: {
                    id: yo.nombre,
                    empresa: config.topic,
                    agente: yo.id,
                    next: viejo.id
                }
            });
            try {
                $("#container-tickets").get(0).removeChild($("#container-tickets span.badge-success").get(0).parentElement);
            } catch (e) {
            }
            $("#container-tickets #" + viejo.id + " > span").removeClass("badge-default");
            $("#container-tickets #" + viejo.id + " > span").addClass("badge-success");
        }

    }, 2000);
}