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

        //The "meshes" is a 2D array of each mesh and its model-space vertices,
        //unaffected by morphs.
        this.meshes = [];

        //The "transformed" paths is a list of { vertices: [], shadow: [] } objects,
        //where each represents a mesh in view-space. This also is affected by morph,
        //and grows/shrinks as needed to match the target.
        this.transformedData = [];

        this.center = new Vector3();

        if (shapes) {
            var minX = Number.MAX_VALUE,
                minY = Number.MAX_VALUE,
                maxX = -Number.MAX_VALUE,
                maxY = -Number.MAX_VALUE;

            for (var i=0; i<shapes.length; i++) {
                var s = shapes[i];
                var len = s.points.length;
                var meshVerts = new Array(len);

                for (var j=0; j<len; j++) {
                    var p = s.points[j];

                    //The original model-space position
                    var v = new Vector3(p.x * scale, p.y * scale, 0);   

                    minX = Math.min(minX, v.x);
                    minY = Math.min(minY, v.y);
                    maxX = Math.max(maxX, v.x);
                    maxY = Math.max(maxY, v.y);

                    meshVerts[j] = v;
                }

                this.meshes.push(meshVerts);
            }

            this.center.set( (minX+maxX)/2, (minY+maxY)/2 );

            this.setup(this.meshes);
        }

        this.shrink = 0;
    },

    setup: function(meshes) {
        var j=0, 
            k=0;

        this.meshes = meshes;

        //clear the old paths
        this.transformedData.length = 0;

        //re-built them..
        for (i=0; i<meshes.length; i++) {
            var s = meshes[i];
            var len = s.length;

            var viewSpaceVerts = new Array(len);
            var shadowVerts = new Array(len);


            for (j=0; j<len; j++) {
                var p = s[j];

                //The view-space position, may be affected by morph
                viewSpaceVerts[j] = new Vector3();

                //projects the view-space vertex onto a floor plane
                shadowVerts[j] = new Vector3();
            }

            var tdata = {
                shadow:      shadowVerts,
                transformed: viewSpaceVerts,
                original:    s,    //points to the same meshes array
                morphed:     null, //Not used yet..
            };

            this.transformedData.push(tdata);
        }

        this.morphTarget = null;
        this.morph = 0.0;
    },



    setMorphTarget: function(target) {
        this.morphTarget = target;

        if (!target) {
            this.setup(this.meshes);
            return;
        }

        //clear old data
        this.transformedData.length = 0;
                
        var meshCount = this.meshes.length;
        var targetMeshCount = target.meshes.length;
        var maxMeshes = Math.max(meshCount, targetMeshCount);

        var morphOrigin = this.center;

        console.log(meshCount, targetMeshCount);

        //Match each path with the target...
        for (var i=0; i<maxMeshes; i++) {
            var m = this.meshes[i];
            if (!m)
                m = [];
            var om = target.meshes[i];
            if (!om)
                om = [];

            var tdata = {
                shadow:      [],
                transformed: [],
                original:    [],
                morphed:     [],
            };


            var maxLen = Math.max(m.length, om.length);

            for (var j=0; j<maxLen; j++) {
                var origPosition = m[j];

                if (!origPosition) //e.g. if we are growing this array
                    origPosition = new Vector3(morphOrigin); 

                tdata.original.push( origPosition );
                tdata.shadow.push( new Vector3() );
                tdata.transformed.push( new Vector3() );

                var morphPosition = null;
                if ( target.meshes[i] )
                    morphPosition = target.meshes[i][j];
                if (!morphPosition)
                    morphPosition = new Vector3(morphOrigin);

                tdata.morphed.push( morphPosition );
            }

            this.transformedData.push(tdata);
        }
    },

    //This transforms the model-space vertices into view-space
    update: function(floor, light) {
        var transformedData = this.transformedData,
            transformMatrix = this.transform,
            morphTarget = this.morphTarget,
            morphing = !!morphTarget,
            morphAlpha = this.morph,

            shrink = this.shrink,
            origin = this.center;



        if (floor)
            util.calculateNormal(floor[0], floor[1], floor[2], nrm);

        for (var j=0; j<transformedData.length; j++) {
            var data = transformedData[j];

            var vertices = data.original,
                shadow = data.shadow,
                morphVerts = data.morphed,
                transformed = data.transformed;

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