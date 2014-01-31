var Class = require('klasse');

var Vector3 = require('vecmath').Vector3;
var Matrix4 = require('vecmath').Matrix4;

var util = require('./shadowMath');
var tmp = new Vector3();
var nrm = new Vector3();

var lerp = require('interpolation').lerp;

/**
 * 
 */
var Glyph = new Class({

    initialize: function(shapes, scale) {
        this.transform = new Matrix4();

        scale = typeof scale === "number" ? scale : 1.0;


        this.paths = [];
        if (shapes) {
            for (var i=0; i<shapes.length; i++) {
                var s = shapes[i];

                var path = {
                    vertices: new Array(s.points.length),
                    shadow: new Array(s.points.length),
                    transformed: new Array(s.points.length)
                };

                for (var j=0; j<s.points.length; j++) {
                    var p = s.points[j];

                    path.vertices[j] = new Vector3(p.x * scale, p.y * scale, 0);
                    
                    //represents the original vertex, transformed into view-space
                    path.transformed[j] = new Vector3();

                    //projects the transformed vertex onto a floor plane
                    path.shadow[j] = new Vector3();
                }

                this.paths.push(path);
            }
        }

        this._morphTarget = null;
    },

    //This transforms the model-space vertices into view-space
    update: function(floor, light) {
        var paths = this.paths,
            transformMatrix = this.transform,
            morphing = !!this.morphTarget,
            morphTarget = this.morphTarget,
            morph = this.morph,
            morphPaths = this.morphPaths;

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

                //copy original..
                o.copy(p);

                //transform the point from model space to view space
                o.transformMat4(transformMatrix);

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