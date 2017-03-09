# Modified elevateZoom - A jQuery image zoom plugin

This is a modification of jQuery elevateZoom 3.0.8
Demo's and documentation for original library:
[jQuery Zoom Plugin](http://www.elevateweb.co.uk/image-zoom/)

## Changes

Support for **rotationAngle** option were added in this edition.

You can now apply elevateZoom for images, rotated by 90, 180 and 270 degrees via css transform, end it will work correctly with them.
On the other hand, support of all zoomTypes, except 'window' ('lens' and 'inner') were removed.
There is also code style improvements in comparison with original (fixed tabs, spaces, line breaks, removed needless empty and commented lines).

## Getting Started

Include jQuery and the plugin on a page. Include your images and initialise the plugin.

```html
<img id="zoom_01" src='images/small/image1.png' data-zoom-image="images/large/image1.jpg" style="transform: rotate(90deg);" />

<script>
    $('#zoom_01').elevateZoom({rotationAngle: 90, zoomWindowPosition: 'demo-container', zoomWindowHeight: 200, zoomWindowWidth: 200});
</script>
```

For more information on how to setup and customise, [check the examples](http://www.elevateweb.co.uk/image-zoom/examples).

## License
Copyright (c) 2012 Andrew Eades
Dual licensed under the GPL and MIT licenses.
