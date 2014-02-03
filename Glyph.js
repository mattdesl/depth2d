var Class = require('klasse');

var Vector3 = require('vecmath').Vector3;
var Matrix4 = require('vecmath').Matrix4;

var util = require('./shadowMath');
var tmp = new Vector3();
var tmp2 = new Vector3();
var nrm = new Vector3();

var lerp = require('interpolation').lerp;

var glyph2tri = require('./glyph2tri');

/**
 * 
 */
var Glyph = new Class({

    initialize: function(shapes, scale) {
        this.transformMatrix = new Matrix4();

        scale = typeof scale === "number" ? scale : 1.0;

        //The "transformed" paths is a list of { vertices: [], shadow: [] } objects,
        //where each represents a mesh in view-space. This also is affected by morph,
        //and grows/shrinks as needed to match the target.
        this.meshData = [];

        this.center = new Vector3();

        this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

        this.deformMatrix = new Matrix4();
        this.deform = 0;

        this.shadowTriangles = [];
        this.transformedTriangles = [];
        this.triangles = [];

        var meshes = [];
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

                meshes.push(meshVerts);
            }

            this.center.set( (minX+maxX)/2, (minY+maxY)/2 );

            this.setup(meshes);

            this.bounds.minX = minX;
            this.bounds.maxX = maxX;
            this.bounds.minY = minY;
            this.bounds.maxY = maxY;
        }

        this.forces = [];
        this.positions = [];
        for (var i=0; i<this.triangles.length; i++) {
            this.positions.push( this.triangles[i].clone() );
            this.forces.push(new Vector3().random());
        }



    },

    setup: function(meshes) {
        var j=0, 
            k=0;

        //clear the old paths
        this.meshData.length = 0;

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
                vertices:    s,    //points to the same meshes array
            };

            this.meshData.push(tdata);
        }

        console.log("SETUP");
        var triangles = glyph2tri.triangulate(this) || [];



        this.triangles.length = 0;
        this.shadowTriangles.length = 0;
        this.transformedTriangles.length = 0;

        for (var i=0; i<triangles.length; i++) {
            var tri = triangles[i];
            for (var k=0; k<tri.points_.length; k++) {
                this.triangles.push( new Vector3(tri.points_[k].x, tri.points_[k].y, 0) );
                this.shadowTriangles.push( new Vector3() );
                this.transformedTriangles.push( new Vector3() );
            }
        }


        


    },


    update: function(floor, light) {
        var transformMatrix = this.transformMatrix,
            deformMatrix = this.deformMatrix,

            positions = this.positions,
            shadow = this.shadowTriangles,
            transformed = this.transformedTriangles,

            origin = this.center,
            deform = this.deform,

            forces = this.forces,

            minX = this.bounds.minX,
            maxX = this.bounds.maxX,
            minY = this.bounds.minY,
            maxY = this.bounds.maxY;


        if (floor)
            util.calculateNormal(floor[0], floor[1], floor[2], nrm);

        deformMatrix.identity();

        for (var i=0; i<positions.length; i++) {
            var p = positions[i];
            var o = transformed[i];


            //copy original..
            o.copy(p);

            //deformMatrix based on XYZ
            //this is a simple twist deform
            
            var rotations = 1;

            var deformScale = 0.05;
            
            if (i%3==0) {
                // tmp.set( 0, (maxY-minY)/2, 0 );
                
                //push along unit vector..
                // deformMatrix.idt();
                var origForce = this.forces[i%this.forces.length];

                var force = tmp.copy( origForce );


                var rsc = 0.9;
                tmp2.copy( origin ).negate();
                // deformMatrix.translate( tmp2 );
                // deformMatrix.rotateY(deform * 1 * rsc);
                // deformMatrix.rotateX(deform *  * rsc);
                // deformMatrix.rotateZ(deform * 1 * rsc);
                // deformMatrix.translate( tmp2.negate() );

                var dsc = 1;
                deformMatrix.scale( tmp2.set(dsc, dsc, dsc) )

                //scale by "explosion" size
                force.scale(deform * 10);
                deformMatrix.translate( force );
                
                // deformMatrix.rotateY(force.x * deform);
                // deformMatrix.translate( tmp.negate() );
            }
            // deformMatrix.idt();
            
            // A twist deform:
            // var yAlpha = Math.max( 0.0, Math.min( 1.0, (o.y - minY)/(maxY - minY) ) );
            // deformMatrix.translate( tmp.set((maxX-minX)/2*deform, 0, 0) );
            // deformMatrix.rotateY(yAlpha * deform * rotations * (-360 * Math.PI/180));    
        
            // A bend deform:                
            // var yAlpha = Math.max( 0.0, Math.min( 1.0, (o.x - minX)/(maxX - minX) ) );
            // deformMatrix.translate( tmp.set( (maxX-minX), (maxY-minY)/2, 0) );
            // deformMatrix.rotateZ(yAlpha * deform * rotations * (-360 * Math.PI/180));    
            // deformMatrix.translate( tmp.set( (maxX-minX), (maxY-minY)/2, 0).negate() );
                

            //apply deformation to model-space
            o.transformMat4(deformMatrix);

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
    },

    //This transforms the model-space vertices into view-space
    ////// this is old, using polygons and shapes instead of triangles..
    updateAsPolygon: function(floor, light) {
        var meshData = this.meshData,
            transformMatrix = this.transformMatrix,
            deformMatrix = this.deformMatrix,

            triangles = this.triangles,

            origin = this.center,
            deform = this.deform,

            minX = this.bounds.minX,
            maxX = this.bounds.maxX,
            minY = this.bounds.minY,
            maxY = this.bounds.maxY;

        if (floor)
            util.calculateNormal(floor[0], floor[1], floor[2], nrm);

        
        deformMatrix.identity();
        for (var j=0; j<meshData.length; j++) {
            var data = meshData[j];

            var vertices = data.vertices,
                shadow = data.shadow,
                transformed = data.transformed;

            for (var i=0; i<vertices.length; i++) {
                var p = vertices[i];
                var o = transformed[i];

                //copy original..
                o.copy(p);

                //deformMatrix based on XYZ
                //this is a simple twist deform
                
                // var rotations = 1;

                // var deformScale = 0.05;
                
                // deformMatrix.idt();
                
                // A twist deform:
                // var yAlpha = Math.max( 0.0, Math.min( 1.0, (o.y - minY)/(maxY - minY) ) );
                // deformMatrix.translate( tmp.set((maxX-minX)/2*deform, 0, 0) );
                // deformMatrix.rotateY(yAlpha * deform * rotations * (-360 * Math.PI/180));    
            
                // A bend deform:                
                // var yAlpha = Math.max( 0.0, Math.min( 1.0, (o.x - minX)/(maxX - minX) ) );
                // deformMatrix.translate( tmp.set( (maxX-minX), (maxY-minY)/2, 0) );
                // deformMatrix.rotateZ(yAlpha * deform * rotations * (-360 * Math.PI/180));    
                // deformMatrix.translate( tmp.set( (maxX-minX), (maxY-minY)/2, 0).negate() );
                

                
                //apply deformation to model-space
                // o.transformMat4(deformMatrix);

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