var $ = require('jquery');
require('raf.js');


var PerspectiveCamera = require('cam3d').PerspectiveCamera;
var Vector2 = require('vecmath').Vector2;
var Vector3 = require('vecmath').Vector3;
var Vector4 = require('vecmath').Vector4;
var Matrix4 = require('vecmath').Matrix4;

var stackblur = require('stackblur').createBlurredCanvas;
var stats = require('stats');

var Glyph = require('./lib/text/Glyph');
var shadowMath = require('./lib/shadowMath');

require('./typeface');
require('./optimer');
require('./canter_bold.typeface');

var fonts = require('./lib/text/typeface-util');
var Text3D = require('./lib/text/Text3D');

//console.log(fonts.getFace('optimer', 'bold'));

var face = fonts.getFace('canter');
var fontSize = 150;

var str = 'CRACK'
var text = new Text3D(str, face, fontSize);
// var fontHeight = fonts.getFaceHeight(face, fontSize);
// var ascent = fonts.getFaceAscent(face, fontSize);

var tweenObj = {
    alpha: 0
};

var mode = 4;

$(window).keydown(function(e) {
    var chr = String.fromCharCode(e.which);
    // console.log(e.which);
    // if (chr && e.which >= 33 && e.which <= 122)
    var x = e.which;

    if (e.which === 13) {
        e.preventDefault();

        tweenObj.alpha = 0.51;
    }
    else if (e.which === 32) {
        e.preventDefault();

        text.setText(str);
        console.log(tweenObj)
        TweenLite.killTweensOf(tweenObj);
        tweenObj.alpha = 0.0;
        var dur = 4;
        TweenLite.to(tweenObj, dur, {
            alpha: 1.0,
            override: 1,
            ease: Strong.easeOut
        });
        TweenLite.to(tweenObj, dur, {
            alpha: 0.0,
            delay: dur,
            override: 1,
            ease: Strong.easeOut
        });
    }
    else if(chr && ((x>32&&x<91)||(x>96&&x<123)||(x>127&&x<155)||(x>159&&x<166))) {
        text.setText(chr.toLowerCase());
    }
});


$(function() {
    var width = window.innerWidth,
        height = window.innerHeight;


    $('<span>').css({
        left: 5,
        top: 25,
        position: 'absolute',
        color: 'white',
        font: "10pt Helvetica, Verdana, 'sans-serif'",
    }).text('Type any key...').appendTo($('body'));


    var statEl =  $('<span>').css({
            left: 5,
            top: 5,
            position: 'absolute',
            color: 'white',
            font: "10pt Helvetica, Verdana, 'sans-serif'",
    }).text('FPS').appendTo($('body'));



    $('body').css({
        margin: 0,
        background: '#24a2b5'
    });

    var canvas = $('<canvas>').appendTo( $('body') );
    canvas[0].width = width;
    canvas[0].height = height;

    var context = canvas[0].getContext("2d");


    var blurs = new Array(40);
    
    //setup a camera with 85 degree FOV
    var camera = new PerspectiveCamera(85 * Math.PI/180, width, height);

    //move the camera back and update its matrices
    camera.position.z = 200;
    camera.update();

    var rotation = 100,
        time = 300,
        tmp = new Vector4();

    var unitScale = 100;

    var mesh = [
        new Vector3(0, 0, 0),
        new Vector3(unitScale, 0, 0),
        new Vector3(unitScale, -unitScale, 0)
    ];

    var projectedMesh = [
        new Vector3(),
        new Vector3(),
        new Vector3()
    ];

    var lightPos = new Vector3(-100, -unitScale/2, 0);

    var floor = [
        new Vector3(-unitScale, 0, -unitScale),
        new Vector3(unitScale, 0, -unitScale),
        new Vector3(unitScale, 0, unitScale),
        new Vector3(-unitScale, 0, unitScale),
    ];

    var transform = new Matrix4();
    transform.identity();
    transform.rotateY(0.01);

    var shear = new Matrix4();
    shear.identity();

    var now = Date.now(),
        then = Date.now();

    var patImg = new Image();
    patImg.src = "img/pattern.png";


    

    function render(ms) {

        now = ms || Date.now();
        var dt = (now - then)/10;
        dt = 1;
        then = now;

        requestAnimationFrame(render);
        stats.begin();

        context.clearRect(0, 0, width, height);
        context.fillStyle = "white";
        context.strokeStyle = "white";

        context.globalAlpha = 1;

        var cameraRadius = (Math.sin(rotation)/2+0.5) * 50 + unitScale*2;
        
        //orbit our camera a little around center 
        var hr = Math.sin(rotation) + Math.PI/2;

        var x = (Math.cos(hr)) * cameraRadius,
            z = (Math.sin(hr)) * cameraRadius;

        camera.position.y = -200;
        camera.position.x = x;
        camera.position.z = z;

        rotation += dt * 0.0025;

        //keep the camera looking at centre of world
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0); 

        //call update() to create the combined matrix
        camera.update();      
            
        time += dt * 0.0075;

        

        // lightPos.transformMat4(transform);
        
        lightPos.x = (Math.sin(time) * -100);
        lightPos.z = unitScale;
        lightPos.y = ((Math.sin(time)/2+0.5) * -50) - 100;

        context.globalAlpha = 0.25;
        drawMesh(floor, false, true);
            
        context.globalAlpha = 1;

        var planeNormal = shadowMath.calculateNormal(floor[0], floor[1], floor[2]);
        // var planeNormal = new Vector3(0, -1, 0);

        context.strokeStyle = "red";
        context.fillStyle = "red";
        // lineFromOrigin(planeNormal, unitScale/2);


        for (var i=0; i<text.glyphs.length; i++)
            text.glyphs[i].deform = tweenObj.alpha;
            // text.glyphs[i].deform = (Math.sin(time) /2 +0.5);

        text.update(floor, lightPos);

        context.fillStyle = 'black';
        context.globalAlpha = 0.3;
        text.fillShadow(context, camera);

        context.globalAlpha = 1;
        context.fillStyle = '#bebebe';
        text.fill(context, camera);

        // context.strokeStyle = "rgba(0,0,0,0.40)";
        // text.drawTriangles(context, camera);

        //light
        context.fillStyle = "yellow";
        camera.project(lightPos, tmp);
        // context.fillRect(tmp.x-5, tmp.y-5, 10, 10);

        stats.end(statEl[0]);
    }



    function lineFromOrigin(pos, scale) {
        camera.project(tmp.set(0,0,0), tmp);
        context.beginPath();
        context.lineTo(tmp.x, tmp.y);

        camera.project( tmp.set(pos).scale(scale), tmp );
        context.lineTo(tmp.x, tmp.y);
        context.stroke();
    }

    function drawMesh(mesh, fill, close) {
        context.beginPath();
        for (var i=0; i<mesh.length; i++) {
            var p = mesh[i];

            camera.project(p, tmp);
            context.lineTo(tmp.x, tmp.y);
        }  
        if (close)
            context.closePath();
        if (fill)
            context.fill();
        else
            context.stroke();
    }

    function getPlaneNormal(p1, p2, p3) {
        var normal = new Vector3();

        var dx1 = p2.x-p1.x,
            dy1 = p2.y-p1.y,
            dz1 = p2.z-p1.z,

            dx2 = p3.x-p1.x,
            dy2 = p3.y-p1.y,
            dz2 = p3.z-p1.z;

        normal.x = dy1*dz2 - dz1*dy2;
        normal.y = dz1*dx2 - dx1*dz2;
        normal.z = dx1*dy2 - dy1*dx2;
        normal.normalize();
        return normal;
    }


    //A method that calculates the parameter called t from a given point on a given
    //surface and with a directional vector that equals the direction of the light.
    //r is a given point in the plane, p is the point we want to project, n is the
    //plane's normal and a is the direction vector of the light.

    function calculateProjection(r, p, n, a){
       var projection = new Vector3();

       //Calculate t
       var t = (n.x*(r.x - p.x) + n.y*(r.y - p.y) + n.z*(r.z - p.z))/
                (n.x*a.x + n.y*a.y + n.z*a.z);

       //Puts t into the equation (1)
       var x1 = p.x + (t * a.x);
       var x2 = p.y + (t * a.y);
       var x3 = p.z + (t * a.z);

       projection.x = x1;
       projection.y = x2;
       projection.z = x3;

       return projection;
    }

    requestAnimationFrame(render);

});