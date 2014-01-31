var $ = require('jquery');
require('raf.js');


var PerspectiveCamera = require('cam3d').PerspectiveCamera;
var Vector2 = require('vecmath').Vector2;
var Vector3 = require('vecmath').Vector3;
var Vector4 = require('vecmath').Vector4;
var Matrix4 = require('vecmath').Matrix4;

var stackblur = require('stackblur').createBlurredCanvas;
var stats = require('stats');

var Glyph = require('./Glyph');
var shadowMath = require('./shadowMath');

require('./typeface');
require('./optimer');
var fonts = require('./typeface-util');

//console.log(fonts.getFace('optimer', 'bold'));

var face = fonts.getFace('optimer', 'bold');
var fontSize = 400;
var glyph = null;
var fontHeight = fonts.getFaceHeight(face, fontSize);
var ascent = fonts.getFaceAscent(face, fontSize);

var mode = 4;

$(window).keydown(function(e) {
    var chr = String.fromCharCode(e.which);
    console.log(e.which);
    // if (chr && e.which >= 33 && e.which <= 122)
    var x = e.which;
    if(chr && ((x>32&&x<91)||(x>96&&x<123)||(x>127&&x<155)||(x>159&&x<166)))
        glyph = setupText(chr);
});

glyph = setupText('F');

function createGlyph(chr) {
    var steps = 10;
    shapes = fonts.getShapeList(face, fontSize, chr, steps);
    if (!shapes) {
        shapes = fonts.getShapeList(face, fontSize, '?', steps) || [];
    }

    //simplify the shape to reduce point coint
    for (var i=0; i<shapes.length; i++) {
        shapes[i] = shapes[i].simplify(10);
    }  
    
    //now create a 3D glyph from that...
    var g = new Glyph(shapes, 0.5);
    g.transform.translate( new Vector3(0, -ascent/2, 0) );
    return g;
}



function setupText(chr) {
    var glyph = createGlyph(chr);
    // glyph.setMorphTarget( createGlyph('@') );
    return glyph;
}

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
        background: 'gray'
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

    function render() {
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

        rotation += 0.0025;

        //keep the camera looking at centre of world
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0); 

        //call update() to create the combined matrix
        camera.update();      
            
        time += 0.0075;

        

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
        lineFromOrigin(planeNormal, unitScale/2);

        //// draw the glyph...
        if (glyph) {
            glyph.morph = Math.sin(time*2)/2+0.5;

            glyph.update(floor, lightPos);

            //draw shadow...
            context.fillStyle = "black";
            context.globalAlpha = 0.25;

            camera.project(tmp.set(0, 0, 0), tmp);
            var grd = context.createRadialGradient(tmp.x, tmp.y, 0, tmp.x, tmp.y, fontSize*0.4);
            grd.addColorStop(0, 'black');
            grd.addColorStop(1, 'rgba(0,0,0,0.0)');
            context.fillStyle = grd;


            drawGlyph(glyph, true, true, 0);

            context.fillStyle = "white";
            context.globalAlpha = 1;
            drawGlyph(glyph, true);
        }

        //light
        context.fillStyle = "yellow";
        camera.project(lightPos, tmp);
        context.fillRect(tmp.x-5, tmp.y-5, 10, 10);

        stats.end(statEl[0]);
    }



    function render2() {
        requestAnimationFrame(render);
        stats.begin();

        context.clearRect(0, 0, width, height);
        context.fillStyle = "white";
        context.strokeStyle = "white";

        context.globalAlpha = 1;
        // context.setTransform(1, 0, 0, 1, 0, 0);

        var cameraRadius = (Math.sin(rotation)/2+0.5) * 50 + unitScale*2;
        
        //orbit our camera a little around center 
        var hr = rotation + Math.PI/2;

        var x = (Math.cos(hr)) * cameraRadius,
            z = (Math.sin(hr)) * cameraRadius;

        camera.position.y = -100;
        camera.position.x = x;
        camera.position.z = z;

        rotation += 0.01;

        //keep the camera looking at centre of world
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0); 

        //call update() to create the combined matrix
        camera.update();      
            
        time += 0.0075;

        


        lightPos.transformMat4(transform);
        lightPos.y = ((Math.sin(time)/2+0.5) * -50) - 60;

        context.fillRect(0, 0, 100, 100);
        drawMesh(floor, false, true);

        //light
        context.fillStyle = "yellow";
        camera.project(lightPos, tmp);
        context.fillRect(tmp.x-5, tmp.y-5, 10, 10);

        var planeNormal = getPlaneNormal(floor[0], floor[1], floor[2]);
        // var planeNormal = new Vector3(0, -1, 0);

        context.strokeStyle = "red";
        lineFromOrigin(planeNormal, unitScale/2);

        projectedMesh[0] = calculateProjection(floor[1], mesh[0], planeNormal, lightPos);
        projectedMesh[1] = calculateProjection(floor[1], mesh[1], planeNormal, lightPos);
        projectedMesh[2] = calculateProjection(floor[1], mesh[2], planeNormal, lightPos);
        
        context.fillStyle = "black";
        context.globalAlpha = 0.25;
        drawMesh(projectedMesh, true, true);


        context.fillStyle = "white";
        context.strokeStyle = "white";
        context.globalAlpha = 1.0;
        drawMesh(mesh, true, true);       
    }

    function lineFromOrigin(pos, scale) {
        camera.project(tmp.set(0,0,0), tmp);
        context.beginPath();
        context.lineTo(tmp.x, tmp.y);

        camera.project( tmp.set(pos).scale(scale), tmp );
        context.lineTo(tmp.x, tmp.y);
        context.stroke();
    }

    function drawGlyph(glyph, fill, shadow, floorY) {
        context.beginPath();


        //draw mesh itself
        for (var i=0; i<glyph.paths.length; i++) {
            var path = glyph.paths[i];
            var list = shadow ? path.shadow : path.transformed;

            for (var j=0; j<list.length; j++) {
                var v = list[j];

                tmp.copy(v);

                // if (shadow && tmp.z > 0) {
                //     tmp.z = 0;
                // }
                
                camera.project(tmp, tmp);

                if (j===0) 
                    context.moveTo(tmp.x, tmp.y);
                else
                    context.lineTo(tmp.x, tmp.y); 
                // context.fillRect(tmp.x-2.5, tmp.y-2.5, 5, 5);       
            }
        }
        if (fill)
            context.fill();
        else
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