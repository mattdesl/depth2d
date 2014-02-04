var Class = require('klasse');

var Vector3 = require('vecmath').Vector3;
var Vector2 = require('vecmath').Vector2;
var Matrix4 = require('vecmath').Matrix4;


var tmp = new Vector3();
var tmp2 = new Vector2();

var lerp = require('interpolation').lerp;
var Glyph = require('./Glyph');

var fonts = require('./typeface-util');

function createGlyph(face, chr, fontSize, steps, simplify, scale) {
    simplify = typeof simplify === "number" ? simplify : 3;
    steps = typeof steps === "number" ? steps : 10;
    scale = typeof scale === "number" ? scale : 1.0;
    var ascent = fonts.getFaceAscent(face, fontSize);

    var shapes = fonts.getShapeList(face, fontSize, chr, steps);
    if (!shapes) {
        return null;
    }

    //simplify the shape to reduce point coint
    for (var i=0; i<shapes.length; i++) {
        shapes[i] = shapes[i].simplify(simplify);
    }  

    //count vertices
    // var count = 0;
    // for (var i=0; i<shapes.length; i++) {
    //     count += shapes[i].points.length;
    // }
    // console.log(chr, count);
    
    //now create a 3D glyph from that...
    var g = new Glyph(shapes);
    
    
    g.transformMatrix.scale( new Vector3(scale, scale, scale) );
    g.transformMatrix.translate( new Vector3(0, -ascent, 0) );
    return g;
}

function drawGlyph(context, camera, glyph, fill, shadow, points) {
    context.beginPath();

    //draw mesh itself
    for (var i=0; i<glyph.meshData.length; i++) {
        var data = glyph.meshData[i];
        var list = shadow ? data.shadow : data.transformed;

        for (var j=0; j<list.length; j++) {
            var v = list[j];

            tmp.copy(v);
            camera.project(tmp, tmp);

            if (!points) {
                if (j===0) 
                    context.moveTo(tmp.x, tmp.y);
                else
                    context.lineTo(tmp.x, tmp.y);
            }

            var sz = 1.5;
            if (points)
                context.fillRect(tmp.x-sz/2, tmp.y-sz/2, sz, sz);
        }
    }
    if (!points) {
        if (fill)
            context.fill();
        else
            context.stroke();
    }
}


function fillStyle(context, value) {
    var v = typeof value === "number" ? ~~Math.max(0, Math.min(255, (value*255))) : Math.floor(Math.random()*255);
    context.fillStyle = "rgb("+v+", "+v+", "+v+")";
}

function random(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getLightFactor(pointA, pointB, pointC, light) {
  var ab = {
    x: pointA.x - pointB.x,
    y: pointA.y - pointB.y,
    z: pointA.z - pointB.z
  };
  var bc = {
    x: pointB.x - pointC.x,
    y: pointB.y - pointC.y,
    z: pointB.z - pointC.z
  };
  var norm = {
    x:  (ab.y * bc.z) - (ab.z * bc.y),
    y:-((ab.x * bc.z) - (ab.z * bc.x)),
    z:  (ab.x * bc.y) - (ab.y * bc.x)
  };
  var dotProd = norm.x * light.x +
                norm.y * light.y +
                norm.z * light.z,
      normMag = Math.sqrt(norm.x * norm.x +
                          norm.y * norm.y +
                          norm.z * norm.z),
      lightMag = Math.sqrt(light.x * light.x +
                           light.y * light.y +
                           light.z * light.z);

  var ret = (Math.acos(dotProd / (normMag * lightMag)) / Math.PI);
  return ret;
};

var tmp3 = new Vector3();

function drawTriangles(context, camera, glyph, fill, shadow, points, light) {
    context.beginPath();

    var list = shadow ? glyph.shadowTriangles : glyph.transformedTriangles;

    var last = tmp2;



    context.beginPath();
    for (var j=0; j<list.length; j++) {
        var v = list[j];
        tmp.copy(v);
        camera.project(tmp, tmp);


        if (j % 3 === 0) { //start of new triangle
            if (j>0) {
                context.lineTo(last.x, last.y);
                // if (j>=3 && light) {
                //     var lf = getLightFactor(list[j-1], list[j-2], list[j-3], tmp3.set(light.x, light.y, light.z)) ;
                //     // lf *= 0.1;
                //     fillStyle( context, lf);
                //     context.fill();
                //     context.beginPath();
                // }
            }
            context.moveTo(tmp.x, tmp.y);

            last.x = tmp.x;
            last.y = tmp.y;
        } else {
            context.lineTo(tmp.x, tmp.y);
        }


    }
    if (j>1)
        context.lineTo(last.x, last.y);
    if (fill)
        context.fill();
    else
        context.stroke();

    // for (var j=0; j<list.length; j++) {
    //     var v = list[j];

    //     tmp.copy(v);
    //     camera.project(tmp, tmp);

    //     if (!points) {
    //         if (j===0) 
    //             context.moveTo(tmp.x, tmp.y);
    //         else
    //             context.lineTo(tmp.x, tmp.y);
    //     }

    //     var sz = 1.5;
    //     if (points)
    //         context.fillRect(tmp.x-sz/2, tmp.y-sz/2, sz, sz);
    // }
    // if (!points) {
    //     if (fill)
    //         context.fill();
    //     else
    //         context.stroke();
    // }
}

var Text3D = new Class({


	initialize: function Text3D(text, face, size, steps, simplify) {
		size = size||32;

        this.text = "";
        this.face = face;
        this.size = size;

        this.gravity = false;

        this.simplify = typeof simplify === "number" ? simplify : 2;
        this.steps = typeof steps === "number" ? steps : 10;

        var wMetric = fonts.getGlyphMetrics(face, size, 'W');

        this.spaceWidth = wMetric ? wMetric.xadvance : size/2;
        this.glyphs = [];
        this.connectors = [];

        var minX = Number.MAX_VALUE,
            minY = Number.MAX_VALUE,
            maxX = -Number.MAX_VALUE,
            maxY = -Number.MAX_VALUE;
        this.bounds = { minX: minX, minY: minY, maxX: maxX, maxY: maxY };

        this.offsets = [];

        this.light = null;
        this.setText(text);
	},



    setText: function(text) {
        text = text||"";

        var size = this.size,
            face = this.face,
            simplify = this.simplify,
            steps = this.steps;

        this.text = text;

        this.offsets.length = 0;
        this.glyphs.length = 0;

        var xoff = 0;
        var metricsList = [];

        for (var i=0; i<text.length; i++) {
            var c = text.charAt(i);
            if (c == '\n' || c == '\r')
                continue;

            if (c == ' ' || c == '\t') {
                metricsList.push( {xadvance: this.spaceWidth });
                continue;
            }

            var glyph = createGlyph(face, c, size, steps, simplify);
            if (!glyph) {
                c = Text3D.DEFAULT_CHARACTER;
                glyph = createGlyph(face, c, size, steps, simplify);
            }
            var metrics = fonts.getGlyphMetrics(face, size, c);
            if (!metrics)
                metrics = {xadvance: 0};

            if (i > 0)
                xoff += metricsList[i-1].xadvance;

            this.offsets.push(xoff);
            metricsList.push(metrics);
            glyph.transformMatrix.translate( new Vector3(xoff, 0, 0) );

            this.bounds.minX = Math.min(this.bounds.minX, xoff + glyph.bounds.minX);
            this.bounds.maxX = Math.max(this.bounds.maxX, xoff + glyph.bounds.maxX);
            this.bounds.minY = Math.min(this.bounds.minY, glyph.bounds.minY);
            this.bounds.maxY = Math.max(this.bounds.maxY, glyph.bounds.maxY);

            this.glyphs.push(glyph);
        }

        
    },

    update: function(floor, light) {
        this.light = light;
        for (var i=0; i<this.glyphs.length; i++)
            this.glyphs[i].update(floor, light);
    },

    render: function(context, camera) {
        context.fillStyle = "black";
        context.globalAlpha = 0.2;
        this.fillShadow(context, camera);

        context.fillStyle = "white";
        context.globalAlpha = 1.0;
        this.drawPoints(context, camera);
    },

    fillShadow: function(context, camera) {
        var glyphs = this.glyphs;
        for (var i=0; i<glyphs.length; i++) {
            var glyph = glyphs[i];

            var bounds = glyph.bounds;
            var off = this.offsets[i];

            camera.project( tmp.set( off + (bounds.maxX-bounds.minX)/2 ), tmp );

            var grd = context.createRadialGradient(tmp.x, tmp.y, 0, tmp.x, tmp.y, 200);
            grd.addColorStop(0, 'black');
            grd.addColorStop(1, 'rgba(0,0,0, 0.0)');
            context.fillStyle = grd;

            drawTriangles(context, camera, glyph, true, true, false);
            // drawGlyph(context, camera, glyph, true, true);
        }
    },

    drawTriangles: function(context, camera) {
        var glyphs = this.glyphs;
        for (var i=0; i<glyphs.length; i++) {
            var glyph = glyphs[i];
            drawTriangles(context, camera, glyph, false, false, true);
            // drawGlyph(context, camera, glyph, false, false, true);
        }
    },

    fill: function(context, camera) {
        var glyphs = this.glyphs;


        for (var i=0; i<glyphs.length; i++) {
            var glyph = glyphs[i];

            drawTriangles(context, camera, glyph, true, false, false, this.light);
            // drawGlyph(context, camera, glyph, true, false);
        }
    }
})

Text3D.DEFAULT_CHARACTER = '?';

module.exports = Text3D;