var Class = require('klasse');

var Vector3 = require('vecmath').Vector3;
var Matrix4 = require('vecmath').Matrix4;

var util = require('./shadowMath');
var tmp = new Vector3();
var nrm = new Vector3();

/**
 * 
 */
var Glyph = new Class({

    initialize: function(shapes, fontHeight, scale) {
        this.transform = new Matrix4();

        scale = typeof scale === "number" ? scale : 0.5;
        fontHeight = fontHeight || 0;

        this.paths = [];

        for (var i=0; i<shapes.length; i++) {
            var s = shapes[i];

            var path = {
                vertices: new Array(s.points.length),
                shadow: new Array(s.points.length),
                transformed: new Array(s.points.length)
            };

            for (var j=0; j<s.points.length; j++) {
                var p = s.points[j];


                path.vertices[j] = new Vector3(p.x * scale, (p.y - fontHeight) * scale, 0);
                path.shadow[j] = new Vector3();
                path.transformed[j] = new Vector3();
            }

            this.paths.push(path);
        }
    },

    //This transforms the model-space vertices into view-space
    update: function(floor, light) {
        var paths = this.paths,
            transformMatrix = this.transform;

        if (floor)
            util.calculateNormal(floor[0], floor[1], floor[2], nrm);

        for (var j=0; j<paths.length; j++) {
            var path = paths[j];

            var vertices = path.vertices,
                shadow = path.shadow,
                transformed = path.transformed;

            for (var i=0; i<vertices.length; i++) {
                var p = vertices[i];
                var o = transformed[i];

                //transform from model space to view space
                o.copy(p).transformMat4(transformMatrix);

                //if we have a floor and light we can project it too...
                if (floor && light) {


                    //store the result in the shadow vertex
                    if (o.y > floor[0].y)
                        shadow[i].copy(o);
                    else   
                        util.calculateProjection( floor[0], o, nrm, light, shadow[i] );


                }
            }
        }
            
    }, 
});

module.exports = Glyph;