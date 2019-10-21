"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// To remember the position from savedPreview so that it can be re-edited from that position if required
var remember_pos = {
    myCanvas1: null,
    myCanvas2: null,
    myCanvas3: null,
    myCanvas4: null
};

var resultsData = {
    1: null,
    2: null,
    3: null,
    4: null
};

var uploadProgress = null;

var Uploader = function () {
    function Uploader(options) {
        _classCallCheck(this, Uploader);

        if (!options.input) {
            throw "[Uploader] Missing input file element.";
        }
        this.fileInput = options.input;
        this.types = options.types || ["gif", "jpg", "jpeg", "png"];
    }

    _createClass(Uploader, [{
        key: "listen",
        value: function listen(resolve, reject) {
            // Make sure one file was selected
            if (!this.fileInput.files || this.fileInput.files.length !== 1) {
                reject("[Uploader:listen] Select only one file.");
            }
            var file = this.fileInput.files[0];
            var reader = new FileReader();
            // Make sure the file is of the correct type
            if (!this.validFileType(file.type)) {
                reject("[Uploader:listen] Invalid file type: " + file.type);
            } else {
                // Read the image as base64 data
                reader.readAsDataURL(file);
                // When loaded, return the file data
                reader.onload = function (e) {
                    resolve(e.target.result);
                };
            }
        }

        /** @private */

    }, {
        key: "validFileType",
        value: function validFileType(filename) {
            // Get the second part of the MIME type
            var extension = filename.split("/").pop().toLowerCase();
            // See if it is in the array of allowed types
            return this.types.includes(extension);
        }
    }]);

    return Uploader;
}();

function squareContains(square, coordinate) {
    return coordinate.x >= square.pos.x && coordinate.x <= square.pos.x + square.size.x && coordinate.y >= square.pos.y && coordinate.y <= square.pos.y + square.size.y;
}

// Converting Image Object to File Object Function
function srcToFile(src, fileName, mimeType) {
    return fetch(src).then(function (res) {
        return res.arrayBuffer();
    }).then(function (buf) {
        return new File([buf], fileName, {
            type: mimeType
        });
    });
}

/** Class for cropping an image. */

var Cropper = function () {
    /**
     * <p>Creates a Cropper instance with parameters passed as an object.</p>
     * <p>Available parameters are:</p>
     * <ul>
     *  <li>size {object} (required): the dimensions of the cropped, resized image. Must have 'width' and 'height' fields. </li>
     *  <li>limit {integer}: the longest side that the cropping area will be limited to, resizing any larger images.</li>
     *  <li>canvas {HTMLElement} (required): the cropping canvas element. Instantiation fails if not provided.</li>
     *  <li>preview {HTMLElement} (required): the preview canvas element. Instantiation fails if not provided.</li>
     * </ul>
     *
     * @example
     * var editor = new Cropper({
     *  size: { width: 128, height: 128 },
     *  limit: 600,
     *  canvas: document.querySelector('.js-editorcanvas'),
     *  preview: document.querySelector('.js-previewcanvas')
     * });
     *
     * @param {object} options the parameters to be passed for instantiation
     */
    function Cropper(options) {
        _classCallCheck(this, Cropper);

        // Check the inputs
        if (!options.size) {
            throw "Size field in options is required";
        }
        if (!options.canvas) {
            throw "Could not find image canvas element.";
        }
        if (!options.preview) {
            throw "Could not find preview canvas element.";
        }
        if (!options.pos) {
            throw "Could not find possition of element.";
        }

        // Hold on to the values
        this.imageCanvas = options.canvas;
        this.previewCanvas = options.preview;
        this.realPreview = options.realPreview;
        this.c = this.imageCanvas.getContext("2d");

        // Images larger than options.limit are resized
        this.limit = options.limit || 1024; // default to 1024px
        // Create the cropping square with the handle's size
        this.crop = {
            size: {
                x: options.size.width,
                y: options.size.height
            },
            pos: {
                x: options.pos.x,
                y: options.pos.y
            },
            handleSize: 10
        };

        // Set the preview canvas size // New Dividing By 2 so that It is Scaled
        this.previewCanvas.width = options.size.width / 2;
        this.previewCanvas.height = options.size.height / 2;

        // Bind the methods, ready to be added and removed as events
        this.boundDrag = this.drag.bind(this);
        this.boundTouchDrag = this.touchDrag.bind(this);
        this.boundClickStop = this.clickStop.bind(this);
    }

    /**
     * Set the source image data for the cropper.
     *
     * @param {String} source the source of the image to crop.
     */


    _createClass(Cropper, [{
        key: "setImageSource",
        value: function setImageSource(source) {
            var _this = this;

            this.image = new Image();
            this.image.src = source;
            this.image.onload = function (e) {
                // Perform an initial render
                _this.render();
                // Listen for events on the canvas when the image is ready
                _this.imageCanvas.onmousedown = _this.clickStart.bind(_this);
                _this.imageCanvas.ontouchstart = _this.touchStart.bind(_this);
            };
        }
        /**
         * Export the result to a given image tag.
         *
         * @param {HTMLElement} img the image tag to export the result to.
         */

    }, {
        key: "export",
        value: function _export(img) {
            var name = document.getElementsByClassName("js-fileinput")[0].files[0].name + "_" + this.crop.size.x + "x" + this.crop.size.y + "_";
            //         srcToFile(this.previewCanvas.toDataURL(), name, 'image/png')
            // .then(function(file){
            //     var fd = new FormData();
            //     fd.append('image', file);
            //     return fetch('https://kane99.pythonanywhere.com/upload/', {method:'POST', body:fd});
            // }).then(response => response.json())
            //     .then(success => {
            //       console.log(success)
            //     })
            //     .catch(error => console.log(error));

            // downloadCanvas(a, 'js-previewcanvas', name+'_755x450_.png');

            img.onload = function () {
                a.download = name + "_" + this.data.width + "x" + this.data.height + "450_.png";
                a.innerHTML = "Download these...";
                //a.appendChild(img);
                document.getElementById("mydiv").appendChild(a);
            };
            // img.appendAfter(document.getElementById("mydiv"));
        }

        /** @private */

    }, {
        key: "render",
        value: function render() {
            this.c.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
            this.displayImage();
            this.preview();
            this.drawCropWindow();
        }

        /** @private */

    }, {
        key: "clickStart",
        value: function clickStart(e) {
            // Get the click position and hold onto it for the expected mousemove
            var position = {
                x: e.offsetX,
                y: e.offsetY
            };
            this.lastEvent = {
                position: position,
                resizing: this.isResizing(position),
                moving: this.isMoving(position)
            };
            // Listen for mouse movement and mouse release
            this.imageCanvas.addEventListener("mousemove", this.boundDrag);
            document.addEventListener("mouseup", this.boundClickStop);
        }

        /** @private */

    }, {
        key: "clickStop",
        value: function clickStop(e) {
            // Stop listening for mouse movement and mouse release
            this.imageCanvas.removeEventListener("mousemove", this.boundDrag);
            document.removeEventListener("mouseup", this.boundClickStop);
        }

        /** @private */

    }, {
        key: "touchStart",
        value: function touchStart(e) {
            // Get the click position and hold onto it for the expected mousemove
            var rect = e.target.getBoundingClientRect();
            var position = {
                x: e.targetTouches[0].pageX - rect.left,
                y: e.targetTouches[0].pageY - rect.top
            };
            this.lastEvent = {
                position: position,
                resizing: this.isResizing(position),
                moving: this.isMoving(position)
            };
            // Listen for mouse movement and mouse release
            this.imageCanvas.addEventListener("touchmove", this.boundTouchDrag);
            document.addEventListener("mouseup", this.boundClickStop);
        }

        /** @private */

    }, {
        key: "isResizing",
        value: function isResizing(coord) {
            var size = this.crop.handleSize;
            var handle = {
                pos: {
                    x: this.crop.pos.x + this.crop.size.x - size / 2,
                    y: this.crop.pos.y + this.crop.size.y - size / 2
                },
                size: {
                    x: size,
                    y: size
                }
            };
            return squareContains(handle, coord);
        }

        /** @private */

    }, {
        key: "isMoving",
        value: function isMoving(coord) {
            return squareContains(this.crop, coord);
        }

        /** @private */

    }, {
        key: "drag",
        value: function drag(e) {
            var position = {
                x: e.offsetX,
                y: e.offsetY
            };

            // Calculate the distance that the mouse has travelled
            var dx = position.x - this.lastEvent.position.x;
            var dy = position.y - this.lastEvent.position.y;
            // Determine whether we are resizing, moving, or nothing
            if (this.lastEvent.resizing) {
                this.resize(dx, dy);
            } else if (this.lastEvent.moving) {
                this.move(dx, dy);
            }
            // Update the last position
            this.lastEvent.position = position;
            this.render();
        }

        /** @private */

    }, {
        key: "touchDrag",
        value: function touchDrag(e) {
            if (this.lastEvent.moving) {
                e.preventDefault();
            }
            var rect = e.target.getBoundingClientRect();
            var position = {
                x: e.targetTouches[0].pageX - rect.left,
                y: e.targetTouches[0].pageY - rect.top
            };
            // Calculate the distance that the mouse has travelled
            var dx = position.x - this.lastEvent.position.x;
            var dy = position.y - this.lastEvent.position.y;
            // Determine whether we are resizing, moving, or nothing
            if (this.lastEvent.resizing) {
                this.resize(dx, dy);
            } else if (this.lastEvent.moving) {
                this.move(dx, dy);
            }
            // Update the last position
            this.lastEvent.position = position;
            this.render();
        }

        /** @private */

    }, {
        key: "resize",
        value: function resize(dx, dy) {
            var handle = {
                x: this.crop.pos.x + this.crop.size.x,
                y: this.crop.pos.y + this.crop.size.y
            };
            var aspectRatio = this.crop.size.x / this.crop.size.y;
            var inverseAspectRatio = 1 / aspectRatio;
            // Maintain the aspect ratio
            var amount = dx > dy ? dx : dy;
            // Make sure that the handle remains within image bounds
            console.log(amount);
            if (this.inBounds(handle.x + amount, handle.y + amount)) {
                this.crop.size.x += amount;
                this.crop.size.y += this.crop.size.x * inverseAspectRatio - this.crop.size.y;
            }
            console.log(this.crop.size.x * 450 / 755 - 450);
            console.log(this.crop.size.x / this.crop.size.y);
        }

        /** @private */

    }, {
        key: "move",
        value: function move(dx, dy) {
            // Get the opposing coordinates
            var tl = {
                x: this.crop.pos.x,
                y: this.crop.pos.y
            };
            var br = {
                x: this.crop.pos.x + this.crop.size.x,
                y: this.crop.pos.y + this.crop.size.y
            };
            // Make sure they are in bounds
            if (this.inBounds(tl.x + dx, tl.y + dy) && this.inBounds(br.x + dx, tl.y + dy) && this.inBounds(br.x + dx, br.y + dy) && this.inBounds(tl.x + dx, br.y + dy)) {
                this.crop.pos.x += dx;
                this.crop.pos.y += dy;
            }
        }

        /** @private */

    }, {
        key: "displayImage",
        value: function displayImage() {
            // Resize the original to the maximum allowed size
            var ratio = this.limit / Math.max(this.image.width, this.image.height);
            this.image.width *= ratio;
            this.image.height *= ratio;
            // Fit the image to the canvas
            this.imageCanvas.width = this.image.width;
            this.imageCanvas.height = this.image.height;
            this.c.drawImage(this.image, 0, 0, this.image.width, this.image.height);
        }

        /** @private */

    }, {
        key: "drawCropWindow",
        value: function drawCropWindow() {
            var pos = this.crop.pos;
            var size = this.crop.size;
            var radius = this.crop.handleSize / 2;
            this.c.strokeStyle = "red";
            this.c.fillStyle = "red";
            // Draw the crop window outline
            this.c.strokeRect(pos.x, pos.y, size.x, size.y);
            // Draw the draggable handle
            var path = new Path2D();
            path.arc(pos.x + size.x, pos.y + size.y, radius, 0, Math.PI * 2, true);
            this.c.fill(path);
        }

        /** @private */

    }, {
        key: "preview",
        value: function preview() {
            var pos = this.crop.pos;
            var size = this.crop.size;
            // Fetch the image data from the canvas
            var imageData = this.c.getImageData(pos.x, pos.y, size.x, size.y);
            if (!imageData) {
                return false;
            }
            // Prepare and clear the preview canvas
            var ctx = this.previewCanvas.getContext("2d");
            ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
            //ctx.clearRect(0, 0, size.x, size.y);
            // Draw the image to the preview canvas, resizing it to fit
            ctx.drawImage(this.imageCanvas,
            // Top left corner coordinates of image
            pos.x, pos.y,
            // Width and height of image
            size.x, size.y,
            // Top left corner coordinates of result in canvas
            0, 0,
            // Width and height of result in canvas // New Dividing By 2 to Scale preview
            this.previewCanvas.width, this.previewCanvas.height);
        }
    }, {
        key: "savePreview",
        value: function savePreview() {
            var pos = this.crop.pos;
            var size = this.crop.size;
            var imageData = this.c.getImageData(pos.x, pos.y, size.x, size.y);
            if (!imageData) {
                return false;
            }
            var ctx = this.realPreview.getContext("2d");
            ctx.clearRect(0, 0, this.realPreview.width, this.realPreview.height);
            this.displayImage();
            ctx.drawImage(this.imageCanvas,
            // Top left corner coordinates of image
            pos.x, pos.y,
            // Width and height of image
            size.x, size.y,
            // Top left corner coordinates of result in canvas
            0, 0,
            // Width and height of result in canvas // New Dividing By 2 to Scale preview
            this.realPreview.width, this.realPreview.height);
            remember_pos[this.realPreview.getAttribute("id")] = {
                x: pos.x,
                y: pos.y
            };
            console.log(remember_pos);
            $(".edi-mode").removeClass("active");
        }

        /** @private */

    }, {
        key: "inBounds",
        value: function inBounds(x, y) {
            return squareContains({
                pos: {
                    x: 0,
                    y: 0
                },
                size: {
                    x: this.imageCanvas.width,
                    y: this.imageCanvas.height
                }
            }, {
                x: x,
                y: y
            });
        }
    }]);

    return Cropper;
}();

function exceptionHandler(message) {
    console.log(message);
}

var _URL = window.URL || window.webkitURL;
$(".img-upload").change(function (e) {
    var image, file;
    if (file = this.files[0]) {
        image = new Image();
        var image2 = new Image();
        image2.onload = function () {
            if (this.width != 1024 || this.height != 1024) {
                alert("Kindly upload an image with size of 1024px x 1024 px");
                $(".img-upload").val(null);
            } else {
                $(".allPreviews").removeClass("hidden");
                var ctx = document.getElementById("myCanvas1").getContext("2d");
                ctx.clearRect(0, 0, 755, 450);
                var pos = {
                    x: (this.width - 755) / 2,
                    y: (this.height - 450) / 2
                };
                var size = {
                    x: 755,
                    y: 450
                };
                ctx.drawImage(this, pos.x, pos.y, size.x, size.y, 0, 0, size.x, size.y);
                // For 365x450
                var ctx2 = document.getElementById("myCanvas2").getContext("2d");
                ctx2.clearRect(0, 0, 365, 450);
                pos = {
                    x: (this.width - 365) / 2,
                    y: (this.height - 450) / 2
                };
                size = {
                    x: 365,
                    y: 450
                };
                ctx2.drawImage(this, pos.x, pos.y, size.x, size.y, 0, 0, size.x, size.y);
                // For 365x212
                var ctx3 = document.getElementById("myCanvas3").getContext("2d");
                ctx3.clearRect(0, 0, 365, 212);
                pos = {
                    x: (this.width - 365) / 2,
                    y: (this.height - 212) / 2
                };
                size = {
                    x: 365,
                    y: 212
                };
                ctx3.drawImage(this, pos.x, pos.y, size.x, size.y, 0, 0, size.x, size.y);
                // For 380x380
                var ctx4 = document.getElementById("myCanvas4").getContext("2d");
                ctx4.clearRect(0, 0, 380, 380);
                pos = {
                    x: (this.width - 380) / 2,
                    y: (this.height - 380) / 2
                };
                size = {
                    x: 380,
                    y: 380
                };
                ctx4.drawImage(this, pos.x, pos.y, size.x, size.y, 0, 0, size.x, size.y);
            }
        };
        image.onload = function () {};
        image2.src = _URL.createObjectURL(file);
        image.src = _URL.createObjectURL(file);
        image.style = "max-width:100%;max-height:100%";
    }
});

function editCanvas1() {
    $(".edi-mode").addClass("active");
    // Auto-resize the cropped image
    var dimensions = {
        width: 755,
        height: 450
    };
    $("#dimensions").text(dimensions.width + "x" + dimensions.height);

    var image = new Image();
    image.onload = function () {
        try {
            var uploader = new Uploader({
                input: document.querySelector(".js-fileinput"),
                types: ["gif", "jpg", "jpeg", "png"]
            });

            var editor = new Cropper({
                size: dimensions,
                canvas: document.querySelector(".js-editorcanvas"),
                preview: document.querySelector(".js-previewcanvas"),
                realPreview: document.querySelector("#myCanvas1"),
                pos: {
                    x: remember_pos["myCanvas1"] == null ? (this.width - 755) / 2 : remember_pos["myCanvas1"].x,
                    y: remember_pos["myCanvas1"] == null ? (this.height - 450) / 2 : remember_pos["myCanvas1"].y
                }
            });
            // Make sure both were initialised correctly
            if (uploader && editor) {
                // Start the uploader, which will launch the editor
                uploader.listen(editor.setImageSource.bind(editor), function (error) {
                    throw error;
                });
            }
            // Allow the result to be exported as an actual image
            var img = document.createElement("img");
            // document.body.appendChild(img);
            // document.querySelector(".js-export").onclick = e =>
            //     editor.export(img);
            document.querySelector(".js-export").onclick = function (e) {
                return editor.savePreview();
            };
        } catch (error) {
            exceptionHandler(error.message);
        }
    };

    image.src = _URL.createObjectURL($(".js-fileinput")[0].files[0]);
}

function editCanvas2() {
    $(".edi-mode").addClass("active");
    // Auto-resize the cropped image
    var dimensions = {
        width: 365,
        height: 450
    };
    $("#dimensions").text(dimensions.width + "x" + dimensions.height);

    var image = new Image();
    image.onload = function () {
        try {
            var uploader = new Uploader({
                input: document.querySelector(".js-fileinput"),
                types: ["gif", "jpg", "jpeg", "png"]
            });

            var editor = new Cropper({
                size: dimensions,
                canvas: document.querySelector(".js-editorcanvas"),
                preview: document.querySelector(".js-previewcanvas"),
                realPreview: document.querySelector("#myCanvas2"),
                pos: {
                    x: remember_pos["myCanvas2"] == null ? (this.width - 365) / 2 : remember_pos["myCanvas2"].x,
                    y: remember_pos["myCanvas2"] == null ? (this.height - 450) / 2 : remember_pos["myCanvas2"].y
                }
            });
            // Make sure both were initialised correctly
            if (uploader && editor) {
                // Start the uploader, which will launch the editor
                uploader.listen(editor.setImageSource.bind(editor), function (error) {
                    throw error;
                });
            }
            // Allow the result to be exported as an actual image
            var img = document.createElement("img");
            // document.body.appendChild(img);
            // document.querySelector(".js-export").onclick = e =>
            //     editor.export(img);
            document.querySelector(".js-export").onclick = function (e) {
                return editor.savePreview();
            };
        } catch (error) {
            exceptionHandler(error.message);
        }
    };

    image.src = _URL.createObjectURL($(".js-fileinput")[0].files[0]);
};

function editCanvas3() {
    $(".edi-mode").addClass("active");
    // Auto-resize the cropped image
    var dimensions = {
        width: 365,
        height: 212
    };
    $("#dimensions").text(dimensions.width + "x" + dimensions.height);

    var image = new Image();
    image.onload = function () {
        try {
            var uploader = new Uploader({
                input: document.querySelector(".js-fileinput"),
                types: ["gif", "jpg", "jpeg", "png"]
            });

            var editor = new Cropper({
                size: dimensions,
                canvas: document.querySelector(".js-editorcanvas"),
                preview: document.querySelector(".js-previewcanvas"),
                realPreview: document.querySelector("#myCanvas3"),
                pos: {
                    x: remember_pos["myCanvas3"] == null ? (this.width - 365) / 2 : remember_pos["myCanvas3"].x,
                    y: remember_pos["myCanvas3"] == null ? (this.height - 212) / 2 : remember_pos["myCanvas3"].y
                }
            });
            // Make sure both were initialised correctly
            if (uploader && editor) {
                // Start the uploader, which will launch the editor
                uploader.listen(editor.setImageSource.bind(editor), function (error) {
                    throw error;
                });
            }
            // Allow the result to be exported as an actual image
            var img = document.createElement("img");
            // document.body.appendChild(img);
            // document.querySelector(".js-export").onclick = e =>
            //     editor.export(img);
            document.querySelector(".js-export").onclick = function (e) {
                return editor.savePreview();
            };
        } catch (error) {
            exceptionHandler(error.message);
        }
    };

    image.src = _URL.createObjectURL($(".js-fileinput")[0].files[0]);
}

function editCanvas4() {
    $(".edi-mode").addClass("active");
    // Auto-resize the cropped image
    var dimensions = {
        width: 380,
        height: 380
    };
    $("#dimensions").text(dimensions.width + "x" + dimensions.height);

    var image = new Image();
    image.onload = function () {
        try {
            var uploader = new Uploader({
                input: document.querySelector(".js-fileinput"),
                types: ["gif", "jpg", "jpeg", "png"]
            });
            var editor = new Cropper({
                size: dimensions,
                canvas: document.querySelector(".js-editorcanvas"),
                preview: document.querySelector(".js-previewcanvas"),
                realPreview: document.querySelector("#myCanvas4"),
                pos: {
                    x: remember_pos["myCanvas4"] == null ? (this.width - 380) / 2 : remember_pos["myCanvas4"].x,
                    y: remember_pos["myCanvas4"] == null ? (this.height - 380) / 2 : remember_pos["myCanvas4"].y
                }
            });
            // Make sure both were initialised correctly
            if (uploader && editor) {
                // Start the uploader, which will launch the editor
                uploader.listen(editor.setImageSource.bind(editor), function (error) {
                    throw error;
                });
            }
            // Allow the result to be exported as an actual image
            var img = document.createElement("img");
            // document.body.appendChild(img);
            // document.querySelector(".js-export").onclick = e =>
            //     editor.export(img);
            document.querySelector(".js-export").onclick = function (e) {
                return editor.savePreview();
            };
        } catch (error) {
            exceptionHandler(error.message);
        }
    };

    image.src = _URL.createObjectURL($(".js-fileinput")[0].files[0]);
};

var uploadOneImage = function uploadOneImage(id, realPreview, name) {
    srcToFile(realPreview.toDataURL(), name, "image/jpeg").then(function (file) {
        var fd = new FormData();
        fd.append("image", file);
        return fetch("https://kane99.pythonanywhere.com/upload/", {
            method: "POST",
            body: fd
        });
    }).then(function (response) {
        return response.json();
    }).then(function (success) {
        uploadProgress = uploadProgress != null ? uploadProgress + parseInt($(".progress").css("width")) * 0.25 : parseInt($(".progress").css("width")) * 0.25;
        $(".progress-bar").css("width", uploadProgress);
        $(".progress-bar").text(uploadProgress / parseInt($(".progress").css("width")) * 100 + "%");
        console.log(success.image);
        resultsData[id] = success.image;
        if ($(".progress-bar").text() == "100%") {
            showResult();
        }
    }).catch(function (error) {
        return console.log(error);
    });
};

$("#upload").on("click", function () {
    var name = document.getElementsByClassName("js-fileinput")[0].files[0].name.split(".")[0];
    var name1 = name + "_" + 755 + "x" + 450 + "_" + ".jpg";
    var name2 = name + "_" + 365 + "x" + 450 + "_" + ".jpg";
    var name3 = name + "_" + 365 + "x" + 212 + "_" + ".jpg";
    var name4 = name + "_" + 380 + "x" + 380 + "_" + ".jpg";
    uploadOneImage(1, $("#myCanvas1")[0], name1);
    uploadOneImage(2, $("#myCanvas2")[0], name2);
    uploadOneImage(3, $("#myCanvas3")[0], name3);
    uploadOneImage(4, $("#myCanvas4")[0], name4);
});

$(".hover-div").on("click", function () {
    var editThese = this.nextElementSibling.getAttribute("id");
    if (editThese == "myCanvas1") {
        editCanvas1();
    } else if (editThese == "myCanvas2") {
        editCanvas2();
    } else if (editThese == "myCanvas3") {
        editCanvas3();
    } else if (editThese == "myCanvas4") {
        editCanvas4();
    }
});

var showResult = function showResult() {
    console.log("hello");
    var url = "https://kane99.pythonanywhere.com";
    $(".allPreviews").addClass("hidden");
    $(".result-table").removeClass("hidden");
    $("#image-1 img").attr("src", url + resultsData[1]);
    $("#image-2 img").attr("src", url + resultsData[2]);
    $("#image-3 img").attr("src", url + resultsData[3]);
    $("#image-4 img").attr("src", url + resultsData[4]);
    $("#image-1 a").attr("href", url + resultsData[1]);
    $("#image-2 a").attr("href", url + resultsData[2]);
    $("#image-3 a").attr("href", url + resultsData[3]);
    $("#image-4 a").attr("href", url + resultsData[4]);
    $("#image-1 a").text(url + resultsData[1]);
    $("#image-2 a").text(url + resultsData[2]);
    $("#image-3 a").text(url + resultsData[3]);
    $("#image-4 a").text(url + resultsData[4]);
};
