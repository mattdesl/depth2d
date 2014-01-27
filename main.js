var $ = require('jquery');
require('raf.js');



//Cool things to try:
//1. http://vimeo.com/channels/bestmotion
//
//2. Clip to backgorund. Scrolly sites in 3D holy #%!@
//
//3. Page transitions. See some text you like? It will actually ZOOM INTO
//the text and you will see the new page (with all its glory) as if you've
//stepped through the window of the font.


var PerspectiveCamera = require('cam3d').PerspectiveCamera;
var Vector2 = require('vecmath').Vector2;
var Vector3 = require('vecmath').Vector3;
var Vector4 = require('vecmath').Vector4;
var Matrix4 = require('vecmath').Matrix4;

var stackblur = require('stackblur').createBlurredCanvas;
var stats = require('stats');

require('./typeface');
require('./optimer');
var fonts = require('./typeface-util');

//console.log(fonts.getFace('optimer', 'bold'));

var face = fonts.getFace('optimer', 'bold');
var fontSize = 400;
var shapes = [];
var fontHeight = fonts.getFaceHeight(face, fontSize);

var mode = 0;

$(window).keydown(function(e) {
    var chr = String.fromCharCode(e.which);
    if (chr)
        shapes = setupText(chr);

    var nm = parseInt((chr).toString(), 10);
    if (nm >= 0 && nm <= 9)
        mode = ~~nm;

});

setupText('@');

function setupText(chr) {
    var steps = 10;
    shapes = fonts.getShapeList(face, fontSize, chr, steps);
    if (!shapes) {
        var q = fonts.getShapeList(face, fontSize, '?', steps);
        return q || [];
    }

    //simplify the shape to reduce point coint
    for (var i=0; i<shapes.length; i++) {
        shapes[i] = shapes[i].simplify(5);
    }  
    return shapes;  
}

$(function() {
    var width = window.innerWidth,
        height = window.innerHeight;

    $('body').css({
        margin: 0,
        background: 'gray'
    });

    var canvas = $('<canvas>').appendTo( $('body') );
    canvas[0].width = width;
    canvas[0].height = height;

    var context = canvas[0].getContext("2d");

    var img = new Image();
    img.onload = blur;
    img.src = "img/particle2.png";

    var blurs = new Array(40);
    
    //setup a camera with 85 degree FOV
    var camera = new PerspectiveCamera(85 * Math.PI/180, width, height);

    //move the camera back and update its matrices
    camera.position.z = 200;
    camera.update();

    //random spherical particles
    var points = createRandomParticles(100, 100);

    //a vector which we will re-use
    var tmp = new Vector4();
    var tmp2 = new Vector3();
    var size = new Vector2();
    var sizeOut = new Vector2();
    var lastPoint = new Vector4();
    var otherPoint = new Vector4();

    var statEl = $("<span>").css({
        position: "absolute",
        top: 0,
        left: 0
    }).appendTo($("body"))[0];

    //creates a new identity matrix
    var transform = new Matrix4();

    var tmpVec3_a = new Vector3();
    var tmpVec3_b = new Vector3();

    function blur() {
        for (var i=0; i<blurs.length; i++) {
            var c = stackblur( img, i );
            blurs[i] = c;
        }
        requestAnimationFrame(render);
    }

    var mat = new Matrix4();
    var mat2 = new Matrix4();

    var spinner = new Vector3();    
    var time = 0;

    var patImg = new Image();
    var pattern = null;
    patImg.onload = function() {
        pattern = context.createPattern(patImg, "repeat");
    }
    patImg.src = "img/beach.jpg";
    
    var page1 = new Image();
    page1.src = "img/page1.png";

    var blob = new Image();
    blob.src = "img/blob.png";

    function rnd(seed) {
        var x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    function render() {
        requestAnimationFrame(render);
        stats.begin();

        context.clearRect(0, 0, width, height);
        context.fillStyle = "white";
        context.strokeStyle = "white";

        context.globalAlpha = 1;
        context.drawImage(page1, 0, 0, width, height);

        context.save();


        var cameraRadius = (Math.sin(rotation)/2+0.5) * 50 + 100;
        
        //orbit our camera a little around center 
        var hr = rotation + Math.PI/2;

        var x = (Math.cos(hr)) * cameraRadius,
            z = (Math.sin(hr)) * cameraRadius;

        camera.position.y = -10;
        camera.position.x = x;
        camera.position.z = z;

        rotation += 0.005;

        //keep the camera looking at centre of world
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0); 

        //call update() to create the combined matrix
        camera.update();      

        // context.translate(100, 100);
            
        time += 0.0075;

        // camera.project(tmp.set(0, 0, 0), tmp);
        // var grd = context.createRadialGradient(tmp.x, tmp.y, 0, tmp.x, tmp.y, cameraRadius);
        // grd.addColorStop(0, "black");
        // grd.addColorStop(1, "white");

        // context.fillStyle = grd;
        // context.lineWidth = 2.0;
        // context.beginPath();

        var minX = Number.MAX_VALUE,
            minY = Number.MAX_VALUE,
            maxX = -Number.MAX_VALUE,
            maxY = -Number.MAX_VALUE;
        




        for (var i=0; i<shapes.length; i++) {
            var s = shapes[i];

            for (var j=0; j<s.points.length; j++) {
                var p = s.points[j];

                tmp.set(p.x * 0.5, (p.y - fontHeight/2) * 0.5, 0);

                minX = Math.min(minX, tmp.x);
                minY = Math.min(minY, tmp.y);
                maxX = Math.max(maxX, tmp.x);
                maxY = Math.max(maxY, tmp.y);
            }
        };

        var boundingX = minX,
            boundingY = minY,
            boundingWidth = (maxX-minX),
            boundingHeight = (maxY-minY);

        // mat.identity();
        // mat.rotateX(Math.PI/2);
        
        // // context.drawImage(blob, shadowX, shadowY, shadowWidth, shadowHeight);

        // context.fillStyle = "red";

        // tmp.set(maxX - (maxX-minX)/2, maxY, 0);

        // size.x = 25;
        // size.y = 25;
        // camera.getPointSize(tmp, size, sizeOut);

        // camera.project(tmp, tmp);
        
        // context.globalAlpha = 0.2;

        
        // sizeOut.x *= 1;
        // sizeOut.y *= 0.75;

        // context.drawImage(blob, tmp.x-sizeOut.x/2, tmp.y-sizeOut.y/2, sizeOut.x, sizeOut.y);
        context.restore();

        if (mode > 2)
            context.beginPath();

        for (var i=0; i<shapes.length; i++) {
            var s = shapes[i];

            for (var j=0; j<s.points.length; j++) {
                var p = s.points[j];

                tmp.set(p.x * 0.5, (p.y - fontHeight/2) * 0.5, 0);

                minX = Math.min(minX, tmp.x);
                minY = Math.min(minY, tmp.y);
                maxX = Math.max(maxX, tmp.x);
                maxY = Math.max(maxY, tmp.y);
                    
                if (mode === 1) {
                    var sinstep = 5;
                    tmp.z = Math.sin(time * (j%sinstep)) * 5;
                    tmp.x += Math.sin(Math.cos(time * (j%sinstep))) * 5;
                }

                //first determine our point size...
                size.x = 5;
                size.y = 5;
                camera.getPointSize(tmp, size, sizeOut);

                camera.project(tmp, tmp);

                //draw the particle with the correct depth size
                var szx = sizeOut.x,
                    szy = sizeOut.y;

                var tmpLoc = tmp;
                var z = Math.abs((tmp.z/tmp.w - cameraRadius) / (camera.position.z));
                var zIndex = Math.max(0, Math.min(blurs.length-1, ~~(z * blurs.length)));
                var spr = blurs[ zIndex ];
                context.globalAlpha = 1.0;
                // context.globalAlpha = 1.0 - Math.max(0, Math.min(1, z));
                // context.fillRect(tmp.x-szx/2, tmp.y-szy/2, szx, szy);
                
                if (mode === 0 || mode === 1)
                    context.drawImage(spr, tmp.x-szx/2, tmp.y-szy/2, szx, szy);



                // var triIndex = Math.max(0, Math.min(s.points.length-1, ~~(rnd(j) * s.points.length)));

                //if we aren't the first point, then connect it with the last...
                if (mode === 2 && j > 0 && j % 2 === 0) {
                    // camera.project(tmp2.set(0, 0, 0), tmp2);

                    var dist = tmp2.distance(tmp);
                    
                    

                    // var grd = context.createRadialGradient(tmp2.x, tmp2.y, 0, tmp2.x, tmp2.y, dist);

                    // var oZ = Math.max(0, Math.min(1, (lastPoint.z/lastPoint.w - 100) / camera.position.z));

                    // grd.addColorStop(0, 'rgba(255,255,255,'+oZ.toFixed(1)+')');
                    // grd.addColorStop(1, 'rgba(255,255,255,'+z.toFixed(1)+')');


                    var off = 0.0;
                    // context.strokeStyle = grd;
                    context.lineWidth = 2;
                    context.globalAlpha = 1.0;
                    context.beginPath();
                    context.moveTo(tmp.x + off, tmp.y + off);
                    context.lineTo(lastPoint.x + off, lastPoint.y + off);
                    context.stroke();
                }

                // if (j > 1 && j % 5 === 0) {
                //     context.save();
                //     context.beginPath();
                //     context.moveTo(tmp.x, tmp.y);
                //     context.lineTo(lastPoint.x, lastPoint.y);
                //     context.lineTo(otherPoint.x, otherPoint.y)
                //     context.closePath();
                //     // context.fillStyle = grd;
                //     context.globalAlpha = 0.25;
                //     context.fill();
                //     context.restore();
                // }

                //store this point ...
                lastPoint.set(tmp);

                // if (j % triIndex === 0)
                //     otherPoint.set(tmp);

                if (mode > 2) {
                    if (j===0) 
                        context.moveTo(tmp.x, tmp.y);
                    else
                        context.lineTo(tmp.x, tmp.y);
                }
                    
            }
            
        }
        if (pattern && mode === 5)
            context.fillStyle = pattern;
        else
            context.fillStyle = "white";
        if (mode > 2) {
            context.closePath();
            if (mode === 3) {
                context.stroke();
            } else
                context.fill();
            // context.fill();
        }
            


       
        stats.end(statEl);
    }


    var tmpSize = new Vector2(1.0, 1.0);
    var tmpPos = new Vector3();

    function drawCirc(radius, rotX, rotY, rotZ) {
        var mult = radius;

        mat.identity();
        mat.rotateY(rotX);
        mat.rotateX(rotY);
        mat.rotateZ(rotZ);
        plane( context, tmpPos, tmpSize, mat, camera );

        context.beginPath();
        context.arc(0, 0, tmpSize.x*mult, Math.PI*2, 0);
        context.stroke();
    }

    //
    function plane(context, position, size, modelTransform, camera, flipY) {
        var tmp1 = tmpVec3_a,
            tmp2 = tmpVec3_b,
            px = position.x,
            py = position.y,
            pz = position.z,
            x0, y0, x1, y1, x2, y2;


        //first we need to build a triangle.
        //then we need to transform that triangle by its model matrix -- rotation/scale/etc.
        //project each of 3 verts into screen-space, based on camera...
        //and then apply the context transformation

        tmp1.x = px - size.x;
        tmp1.y = py;
        tmp1.z = pz - size.y;
        if (modelTransform) 
            tmp1.transformMat4(modelTransform);
        camera.project(tmp1, tmp2);
        x0 = tmp2.x;
        y0 = tmp2.y;

        tmp1.x = px - size.x;
        tmp1.y = py;
        tmp1.z = pz + size.y;
        if (modelTransform) 
            tmp1.transformMat4(modelTransform);
        camera.project(tmp1, tmp2);
        x1 = tmp2.x;
        y1 = tmp2.y;

        tmp1.x = px + size.x;
        tmp1.y = py;
        tmp1.z = pz + size.y;
        if (modelTransform) 
            tmp1.transformMat4(modelTransform);
        camera.project(tmp1, tmp2);
        x2 = tmp2.x;
        y2 = tmp2.y;
        var sx0 = 0, 
            sy0 = 0,
            sx1 = 0, 
            sy1 = 1,
            sx2 = 1, 
            sy2 = 1;
        
        // context.beginPath();
        // context.lineTo(x0, y0);
        // context.lineTo(x1, y1);
        // context.lineTo(x2, y2);
        // context.closePath();
        // context.stroke();


        //http://tulrich.com/geekstuff/canvas/perspective.html
        var denom = sx0 * (sy2 - sy1) - sx1 * sy2 + sx2 * sy1 + (sx1 - sx2) * sy0;
        if (denom == 0) {
        return;
        }
        var m11 = - (sy0 * (x2 - x1) - sy1 * x2 + sy2 * x1 + (sy1 - sy2) * x0) / denom;
        var m12 = (sy1 * y2 + sy0 * (y1 - y2) - sy2 * y1 + (sy2 - sy1) * y0) / denom;
        var m21 = (sx0 * (x2 - x1) - sx1 * x2 + sx2 * x1 + (sx1 - sx2) * x0) / denom;
        var m22 = - (sx1 * y2 + sx0 * (y1 - y2) - sx2 * y1 + (sx2 - sx1) * y0) / denom;
        var dx = (sx0 * (sy2 * x1 - sy1 * x2) + sy0 * (sx1 * x2 - sx2 * x1) + (sx2 * sy1 - sx1 * sy2) * x0) / denom;
        var dy = (sx0 * (sy2 * y1 - sy1 * y2) + sy0 * (sx1 * y2 - sx2 * y1) + (sx2 * sy1 - sx1 * sy2) * y0) / denom;

        context.setTransform(m11, m12, m21, m22, dx, dy);

        return Math.max(m11, m22);
    }

    var txtImg1 = new Image();
    txtImg1.src = "img/textblur1.png";
    var txtImg2 = new Image();
    txtImg2.src = "img/textblur2.png";
    var rotation = 0;

    function render3() {

        requestAnimationFrame(render);
        stats.begin();

        context.clearRect(0, 0, width, height);
        context.fillStyle = "white";
        context.strokeStyle = "white";


        context.save();

        var aspect = txtImg2.height === 0 ? 0 : txtImg2.width / txtImg2.height;
        var cameraRadius = 200;



        //orbit our camera a little around center 
        var hr = rotation;

        var x = (Math.cos(hr)) * cameraRadius,
            z = (Math.sin(hr)) * cameraRadius;

        camera.position.y = z;
        camera.position.x = x;
        camera.position.z = z;

        rotation += 0.005;

        //keep the camera looking at centre of world
        camera.lookAt(0, 0, 0);
        camera.up.set(0, 1, 0); 

        //call update() to create the combined matrix
        camera.update(); 


        mat.identity();
        // mat.rotateX( Math.PI/2 );

        // mat.rotateZ( rotation*0.25 );
        // mat.rotateZ(rotZ);
        tmpPos.set(0, 0, 0);
        tmpSize.set( 0.25, 0.25 );
        plane( context, tmpPos, tmpSize, mat, camera );

        context.globalAlpha = 0.25;
        context.drawImage(txtImg2, -txtImg2.width/2, -txtImg2.height/2);
        context.globalAlpha = 1;
        context.strokeStyle = 'white';
        context.strokeRect(0, 0, 100.0, 100.0);
        //context.drawImage(txtImg1, 0, 0);

        mat.identity();
        // mat.rotateX( Math.PI + Math.sin(rotation)*0.25 );
        // mat.rotateZ( rotation*0.25 );
        
        tmpPos.set(0, 0, 0);
        plane( context, tmpPos, tmpSize, mat, camera );
        context.globalAlpha = 1;
        context.drawImage(txtImg1, -txtImg1.width/2, -txtImg1.height/2);
        context.strokeRect(0, 0, 100.0, 100.0);

        context.restore();


        stats.end(statEl);
    }

    //our render loop
    function render2() {
        requestAnimationFrame(render);
        stats.begin();

        context.clearRect(0, 0, width, height);
        context.fillStyle = "white";
        context.strokeStyle = "white";
        



        for (var i=0; i<points.length; i++) {
            var p = points[i];

            //rotate the transformation matrix around the Y axis a little..
            // transform.translate( tmp.set(0.001, 0, 0) );
            transform.rotateY(0.00005);


            //now let's transform the 3D position by our transformation matrix
            //this will give us a new position that has been slightly rotated by
            //our matrix.
            tmp.set(p.x, p.y, p.z, 1.0).transformMat4(transform);   

            //first determine our point size...
            size.x = 5;
            size.y = 5;
            camera.getPointSize(tmp, size, sizeOut);

            //now project the 3D point into 2D space
            camera.project(tmp, tmp);


            //draw the particle with the correct depth size
            var szx = sizeOut.x,
                szy = sizeOut.y;

            var z = (tmp.z/tmp.w - 100) / (camera.position.z);
            var zIndex = Math.max(0, Math.min(blurs.length-1, ~~(z * blurs.length)));
            var spr = blurs[ zIndex ];
            context.globalAlpha = 1.0;
            // context.fillRect(tmp.x-szx/2, tmp.y-szy/2, szx, szy);
            context.drawImage(spr, tmp.x-szx/2, tmp.y-szy/2, szx, szy);

            //if we aren't the first point, then connect it with the last...
            if (i > 0 && i % 6 === 0) {
                camera.project(tmp2.set(0, 0, 0), tmp2);

                var dist = tmp2.distance(tmp);
                
                

                var grd = context.createRadialGradient(tmp2.x, tmp2.y, 0, tmp2.x, tmp2.y, dist);

                var oZ = Math.max(0, Math.min(1, (lastPoint.z/lastPoint.w - 100) / camera.position.z));

                grd.addColorStop(0, 'rgba(255,255,255,'+oZ.toFixed(1)+')');
                grd.addColorStop(1, 'rgba(255,255,255,'+z.toFixed(1)+')');


                var off = 0.0;
                context.strokeStyle = grd;
                context.lineWidth = 2;
                context.globalAlpha = 1.0;
                context.beginPath();
                context.moveTo(tmp.x + off, tmp.y + off);
                context.lineTo(lastPoint.x + off, lastPoint.y + off);
                context.stroke();

                if (i > 1 && i % 6 === 0) {
                    // context.beginPath();
                    // context.moveTo(tmp.x, tmp.y);
                    // context.lineTo(lastPoint.x, lastPoint.y);
                    
                    // context.lineTo(otherPoint.x, otherPoint.y)
                    // context.closePath();
                    // context.fillStyle = grd;
                    // context.globalAlpha = 0.25;
                    // context.fill();
                }
            }


            //store this point ...
            lastPoint.set(tmp);

            if (i % 6 === 0)
                otherPoint.set(tmp);
        }

        stats.end(statEl);
    }

    //a utility to create particles randomly in a spherical area
    // r - radius
    // n - number of points
    function createRandomParticles(r, n) {
        var points = [];
        for (var i=0; i<n; i++) {
            points.push(new Vector3().random(r));
        }
        return points;
    }
});