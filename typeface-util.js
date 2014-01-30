var Vector2 = require('vecmath').Vector2;
var Shape = require('shape2d');

var style = {
    fontSize: 12,
    fontStretchPercent: 1.0,
    letterSpacing: 0
};
      
module.exports.getFaces = function() {
    return _typeface_js.faces;
};

module.exports.getFace = function(family, weight, style) {
    weight = weight || "normal";
    style = style || "normal";
    family = family.toLowerCase();

    var face = null;
    if (_typeface_js && _typeface_js.faces) {
        if (!(family in _typeface_js.faces)) {
            throw "No font with the name "+family;
        }
        
        var fonts = _typeface_js.faces[family];
            
        if (!(weight in fonts)) {
            throw "No weight with the value "+weight;
        }
            
        var weightDict = fonts[weight];
        
        if (!(style in weightDict)) {
            throw "No style with the type "+style;
        }
        
        face = weightDict[style];
    }
    return face;  
};

module.exports.getFaceHeight = function(face, size) {
    style.fontSize = size; 
    return Math.round(_typeface_js.pixelsFromPoints(face, style, face.lineHeight));
}

module.exports.getFaceAscent = function(face, size) {
    style.fontSize = size;
    return Math.round(_typeface_js.pixelsFromPoints(face, style, face.ascender));   
}

module.exports.getPointScale = function(face, size) {
    style.fontSize = size; 
    return _typeface_js.pixelsFromPoints(face, style, 1);
};

function scaleAndOffset(shape, scale, offset) {
    var p = shape.points;
    for (var i=0; i<p.length; i++) {
        p[i].x = p[i].x * scale.x + offset.x;
        p[i].y = p[i].y * scale.y + offset.y;
    }
}


function isClockwise(points) {
    var sum = 0;
    for (var i=0; i<points.length-1; i++) {
        sum += (points[i+1].x - points[i].x) * (points[i+1].y + points[i].y);
    }
    return sum > 0;
}

function getShapeList(face, size, chr, steps) {
    steps = steps || 10;
    style.fontSize = size;
    
    var glyph = face.glyphs[chr];
    if (!glyph || !glyph.o)
        return null;
    
    moveTo(0, 0);
    var shapes = [];
    var shape = new Shape();

    var curves = false, //expose this...
        factor = 0.5;
    shape.approximateCurves = curves;
    shape.approximationFactor = factor;
    shape.steps = steps;

    var pointScale = _typeface_js.pixelsFromPoints(face, style, 1);
    var scl = new Vector2(pointScale * style.fontStretchPercent, -pointScale);
    var off = new Vector2(0, face.ascender*pointScale);
    
    var outline = glyph.o.split(' ');
    var outlineLength = outline.length;
    for (var i = 0; i < outlineLength; ) {
        var action = outline[i++];

        switch(action) {
            case 'm':
                if (i!==1) {
                    scaleAndOffset(shape, scl, off);
                    shapes.push(shape);

                    shape = new Shape();
                    shape.approximateCurves = curves;
                    shape.approximationFactor = factor;
                    shape.steps = steps;
                }
                shape.moveTo(outline[i++], outline[i++]);
                break;
            case 'l':
                shape.lineTo(outline[i++], outline[i++]);
                break;
            case 'q':
                var cpx = outline[i++];
                var cpy = outline[i++];
                shape.quadraticCurveTo(outline[i++], outline[i++], cpx, cpy);
                break;
            case 'b':
                var x = outline[i++];
                var y = outline[i++];
                shape.bezierCurveTo(outline[i++], outline[i++], outline[i++], outline[i++], x, y);
                break;
        }
    }
    scaleAndOffset(shape, scl, off);
    shapes.push(shape);
    return shapes;
}

//// TODO: this needs to be cleaned up. but in many cases it will never get used..
module.exports.getGlyph = function(face, size, chr, steps) {
    var shapes = getShapeList(face, size, chr, steps);

    var poly = { 
        holes: [], 
        contour: null
    };

    var fontShape = {
        polygons: [],
        xadvance: 0,
        lineHeight: 0
    }

    var windingClockwise = false;
    for (var j=0; j<shapes.length; j++) {
        var s = shapes[j];
        var points = s.points;
        
        //assume the first winding order is different for holes...
        if (j==0) {
            windingClockwise = isClockwise(points);

            poly.contour = s;
        } 
        else {
            var clock = isClockwise(points);

            //found a hole
            if (windingClockwise !== clock) {
                poly.holes.push( s );
            } 
            //not a hole, so it must be a new shape.
            //add our last shape to the list
            else {
                fontShape.polygons.push( poly );
                poly = { contour: s, holes: [] };
            }
        }
    }

    //if we had at least 1 shape...
    if (j>0)
        fontShape.polygons.push( poly );


    var glyph = face.glyphs[char];

    var pointScale = module.exports.getPointScale(face, fontSize);
    fontShape.xadvance = (glyph && glyph.ha) ? glyph.ha * pointScale : 0;
    fontShape.lineHeight = module.exports.getFaceHeight(face, fontSize);
    return fontShape;
};


module.exports.getShapeList = getShapeList;