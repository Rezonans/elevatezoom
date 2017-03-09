/*
 * This is a modification of jQuery elevateZoom 3.0.8
 * https://github.com/Rezonans/elevatezoom
 *
 * Demo's and documentation for original library:
 * www.elevateweb.co.uk/image-zoom
 *
 * Support for rotationAngle option were added in this edition.
 * You can now apply elevateZoom for images, rotated by 90, 180 and 270 degrees via css transform, end it will work correctly with them.
 * On the other hand, support of all zoomTypes, except 'window' ('lens' and 'inner') were removed.
 * There is also code style improvements in comparison with original (fixed tabs, spaces, line breaks, removed needless empty and commented lines).
 *
 * Copyright (c) 2012 Andrew Eades
 * www.elevateweb.co.uk
 *
 * Dual licensed under the GPL and MIT licenses.
 * http://en.wikipedia.org/wiki/MIT_License
 * http://en.wikipedia.org/wiki/GNU_General_Public_License
 */

if (typeof Object.create !== 'function') {
  Object.create = function (obj) {
    function F() {
    }

    F.prototype = obj;
    return new F();
  };
}

(function ($, window, document, undefined) {
  var ElevateZoom = {
    init: function (options, elem) {
      var self = this;
      self.elem = elem;
      self.$elem = $(elem);
      self.imageSrc = self.$elem.data('zoom-image') ? self.$elem.data('zoom-image') : self.$elem.attr('src');
      self.options = $.extend({}, $.fn.elevateZoom.options, options);
      //TINT OVERRIDE SETTINGS
      if (self.options.tint) {
        self.options.lensColour = 'none'; //colour of the lens background
        self.options.lensOpacity = '1'; //opacity of the lens
      }
      if ([0, 90, 180, 270].indexOf(self.options.rotationAngle) < 0) {
        console.warn('ElevateZoom: rotationAngle should be one of 0, 90, 180 or 270. Using default value: 0');
        self.options.rotationAngle = 0;
      }
      //Remove alt on hover
      self.$elem.parent().removeAttr('title').removeAttr('alt');
      self.zoomImage = self.imageSrc;
      self.refresh(1);
      //Create the image swap from the gallery
      $('#' + self.options.gallery + ' a').click(function (e) {
        //Set a class on the currently active gallery image
        if (self.options.galleryActiveClass) {
          $('#' + self.options.gallery + ' a').removeClass(self.options.galleryActiveClass);
          $(this).addClass(self.options.galleryActiveClass);
        }
        //stop any link on the a tag from working
        e.preventDefault();
        //call the swap image function
        if ($(this).data('zoom-image')) {
          self.zoomImagePre = $(this).data('zoom-image')
        } else {
          self.zoomImagePre = $(this).data('image');
        }
        self.swaptheimage($(this).data('image'), self.zoomImagePre);
        return false;
      });
    },

    refresh: function (length) {
      var self = this;
      setTimeout(function () {
        self.fetch(self.imageSrc);
      }, length || self.options.refresh);
    },

    fetch: function (imgsrc) {
      //get the image
      var self = this;
      var newImg = new Image();
      newImg.onload = function () {
        //set the large image dimensions - used to calculte ratio's
        self.largeWidth = newImg.width;
        self.largeHeight = newImg.height;
        //once image is loaded start the calls
        self.startZoom();
        self.currentImage = self.imageSrc;
        //let caller know image has been loaded
        self.options.onZoomedImageLoaded(self.$elem);
      };
      newImg.src = imgsrc; // this must be done AFTER setting onload
    },

    startZoom: function () {
      var self = this;
      //get dimensions of the non zoomed image
      self.nzWidth = self.$elem.width();
      self.nzHeight = self.$elem.height();

      //activated elements
      self.isWindowActive = false;
      self.isLensActive = false;
      self.isTintActive = false;
      self.overWindow = false;

      //CrossFade Wrapper
      if (self.options.imageCrossfade) {
        self.zoomWrap = self.$elem.wrap('<div style="height:' + self.nzHeight + 'px;width:' + self.nzWidth + 'px;" class="zoomWrapper" />');
        self.$elem.css('position', 'absolute');
      }

      self.zoomLock = 1;
      self.scrollingLock = false;
      self.changeBgSize = false;
      self.currentZoomLevel = self.options.zoomLevel;

      //get offset of the non zoomed image
      self.nzOffset = self.$elem.offset();
      //calculate the width ratio of the large/small image
      self.widthRatio = (self.largeWidth / self.currentZoomLevel) / self.nzWidth;
      self.heightRatio = (self.largeHeight / self.currentZoomLevel) / self.nzHeight;

      //if window zoom
      if (self.options.zoomType == 'window') {
        self.zoomWindowStyle = 'overflow: hidden;'
          + 'background-position: 0px 0px;text-align:center;'
          + 'background-color: ' + String(self.options.zoomWindowBgColour) + ';'
          + 'float: left;'
          + 'background-size: ' + self.largeWidth / self.currentZoomLevel + 'px ' + self.largeHeight / self.currentZoomLevel + 'px;'
          + 'display: none;z-index:100;'
          + 'border: ' + String(self.options.borderSize)
          + 'px solid ' + self.options.borderColour
          + ';background-repeat: no-repeat;'
          + 'position: absolute;'
          + 'transform: rotate(' + self.options.rotationAngle + 'deg);';
        if (self.options.rotationAngle == 0 || self.options.rotationAngle == 180) {
          self.zoomWindowStyle += 'width: ' + String(self.options.zoomWindowWidth) + 'px;' + 'height: ' + String(self.options.zoomWindowHeight) + 'px;';
        } else if (self.options.rotationAngle == 90 || self.options.rotationAngle == 270) {
          self.zoomWindowStyle += 'width: ' + String(self.options.zoomWindowHeight) + 'px;' + 'height: ' + String(self.options.zoomWindowWidth) + 'px;';
        }
      }

      //lens style for window zoom
      if (self.options.zoomType == 'window') {
        // adjust images less than the window height
        if (self.nzHeight < self.options.zoomWindowWidth / self.widthRatio) {
          lensHeight = self.nzHeight;
        } else {
          lensHeight = String((self.options.zoomWindowHeight / self.heightRatio))
        }
        if (self.largeWidth < self.options.zoomWindowWidth) {
          lensWidth = self.nzWidth;
        } else {
          lensWidth = (self.options.zoomWindowWidth / self.widthRatio);
        }
        self.lensStyle = 'background-position: 0px 0px;width: ' + String((self.options.zoomWindowWidth) / self.widthRatio) + 'px;height: ' + String((self.options.zoomWindowHeight) / self.heightRatio)
          + 'px;float: right;display: none;'
          + 'overflow: hidden;'
          + 'z-index: 999;'
          + '-webkit-transform: translateZ(0);'
          + 'opacity:' + (self.options.lensOpacity) + ';filter: alpha(opacity = ' + (self.options.lensOpacity * 100) + '); zoom:1;'
          + 'width:' + lensWidth + 'px;'
          + 'height:' + lensHeight + 'px;'
          + 'background-color:' + (self.options.lensColour) + ';'
          + 'cursor:' + (self.options.cursor) + ';'
          + 'border: ' + (self.options.lensBorderSize) + 'px' +
          ' solid ' + (self.options.lensBorderColour) + '; background-repeat: no-repeat; position: absolute;';
      }

      //tint style
      self.tintStyle = 'display: block;'
        + 'position: absolute;'
        + 'background-color: ' + self.options.tintColour + ';'
        + 'filter:alpha(opacity=0);'
        + 'opacity: 0;'
        + 'width: ' + self.nzWidth + 'px;'
        + 'height: ' + self.nzHeight + 'px;';

      //lens style for lens zoom with optional round for modern browsers
      self.lensRound = '';

      //does not round in all browsers
      if (self.options.lensShape == 'round') {
        self.lensRound = 'border-top-left-radius: ' + String(self.options.lensSize / 2 + self.options.borderSize) + 'px;'
          + 'border-top-right-radius: ' + String(self.options.lensSize / 2 + self.options.borderSize) + 'px;'
          + 'border-bottom-left-radius: ' + String(self.options.lensSize / 2 + self.options.borderSize) + 'px;'
          + 'border-bottom-right-radius: ' + String(self.options.lensSize / 2 + self.options.borderSize) + 'px;';
      }

      self.zoomContainer = $('<div class="zoomContainer"></div>');
      self.zoomContainer.css({
        '-webkit-transform': 'translateZ(0)',
        position: 'absolute',
        left: self.nzOffset.left,
        top: self.nzOffset.top
      });

      if (self.options.rotationAngle == 0 || self.options.rotationAngle == 180) {
        self.zoomContainer.css({height: self.nzHeight, width: self.nzWidth});
      } else if (self.options.rotationAngle == 90 || self.options.rotationAngle == 270) {
        self.zoomContainer.css({height: self.nzWidth, width: self.nzHeight});
      }

      $('body').append(self.zoomContainer);

      if (self.options.zoomType != 'inner') {
        self.zoomLens = $('<div class="zoomLens" style="' + self.lensStyle + self.lensRound + '">&nbsp;</div>')
          .appendTo(self.zoomContainer)
          .click(function () {
            self.$elem.trigger('click');
          });

        if (self.options.tint) {
          self.tintContainer = $('<div/>').addClass('tintContainer');
          self.zoomTint = $('<div class="zoomTint" style="' + self.tintStyle + '"></div>');
          self.zoomLens.wrap(self.tintContainer);
          self.zoomTintcss = self.zoomLens.after(self.zoomTint);
          //if tint enabled - set an image to show over the tint
          self.zoomTintImage = $('<img style="position: absolute; left: 0; top: 0; max-width: none; width: ' + self.nzWidth + 'px; height: ' + self.nzHeight + 'px;" src="' + self.imageSrc + '">')
            .appendTo(self.zoomLens)
            .click(function () {
              self.$elem.trigger('click');
            });
        }
      }

      //create zoom window
      if (isNaN(self.options.zoomWindowPosition)) {
        self.zoomWindow = $('<div style="z-index:999; left:' + (self.windowOffsetLeft) + 'px; top:' + (self.windowOffsetTop) + 'px; ' + self.zoomWindowStyle + '" class="zoomWindow">&nbsp;</div>')
          .appendTo('body')
          .click(function () {
            self.$elem.trigger('click');
          });
      } else {
        self.zoomWindow = $('<div style="z-index:999; left:' + (self.windowOffsetLeft) + 'px; top:' + (self.windowOffsetTop) + 'px; ' + self.zoomWindowStyle + '" class="zoomWindow">&nbsp;</div>')
          .appendTo(self.zoomContainer)
          .click(function () {
            self.$elem.trigger('click');
          });
      }
      self.zoomWindowContainer = $('<div/>').addClass('zoomWindowContainer').css('width', self.options.zoomWindowWidth);
      self.zoomWindow.wrap(self.zoomWindowContainer);

      if (self.options.zoomType == 'window') {
        self.zoomWindow.css({backgroundImage: 'url("' + self.imageSrc + '")'});
      }

      //touch events
      self.$elem.bind('touchmove', function (e) {
        e.preventDefault();
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        self.setPosition(touch);

      });
      self.zoomContainer.bind('touchmove', function (e) {
        e.preventDefault();
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        self.setPosition(touch);

      });
      self.zoomContainer.bind('touchend', function (e) {
        self.showHideWindow('hide');
        if (self.options.showLens) {
          self.showHideLens('hide');
        }
        if (self.options.tint && self.options.zoomType != 'inner') {
          self.showHideTint('hide');
        }
      });
      self.$elem.bind('touchend', function (e) {
        self.showHideWindow('hide');
        if (self.options.showLens) {
          self.showHideLens('hide');
        }
        if (self.options.tint && self.options.zoomType != 'inner') {
          self.showHideTint('hide');
        }
      });
      if (self.options.showLens) {
        self.zoomLens.bind('touchmove', function (e) {
          e.preventDefault();
          var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
          self.setPosition(touch);
        });
        self.zoomLens.bind('touchend', function (e) {
          self.showHideWindow('hide');
          if (self.options.showLens) {
            self.showHideLens('hide');
          }
          if (self.options.tint && self.options.zoomType != 'inner') {
            self.showHideTint('hide');
          }
        });
      }
      //Needed to work in IE
      self.$elem.bind('mousemove', function (e) {
        if (self.overWindow == false) {
          self.setElements('show');
        }
        //make sure on orientation change the setposition is not fired
        if (self.lastX !== e.clientX || self.lastY !== e.clientY) {
          self.setPosition(e);
          self.currentLoc = e;
        }
        self.lastX = e.clientX;
        self.lastY = e.clientY;
      });
      self.zoomContainer.bind('mousemove', function (e) {
        if (self.overWindow == false) {
          self.setElements('show');
        }
        //make sure on orientation change the setposition is not fired
        if (self.lastX !== e.clientX || self.lastY !== e.clientY) {
          self.setPosition(e);
          self.currentLoc = e;
        }
        self.lastX = e.clientX;
        self.lastY = e.clientY;
      });
      if (self.options.zoomType != 'inner') {
        self.zoomLens.bind('mousemove', function (e) {
          //make sure on orientation change the setposition is not fired
          if (self.lastX !== e.clientX || self.lastY !== e.clientY) {
            self.setPosition(e);
            self.currentLoc = e;
          }
          self.lastX = e.clientX;
          self.lastY = e.clientY;
        });
      }
      if (self.options.tint && self.options.zoomType != 'inner') {
        self.zoomTint.bind('mousemove', function (e) {
          //make sure on orientation change the setposition is not fired
          if (self.lastX !== e.clientX || self.lastY !== e.clientY) {
            self.setPosition(e);
            self.currentLoc = e;
          }
          self.lastX = e.clientX;
          self.lastY = e.clientY;
        });
      }

      //  lensFadeOut: 500,  zoomTintFadeIn
      self.zoomContainer.add(self.$elem).mouseenter(function () {
        if (self.overWindow == false) {
          self.setElements('show');
        }
      }).mouseleave(function () {
        if (!self.scrollLock) {
          self.setElements('hide');
          self.options.onDestroy(self.$elem);
        }
      });
      //end over image

      if (self.options.zoomType != 'inner') {
        self.zoomWindow.mouseenter(function () {
          self.overWindow = true;
          self.setElements('hide');
        }).mouseleave(function () {
          self.overWindow = false;
        });
      }
      //end over image

      //set the min zoomlevel
      if (self.options.minZoomLevel) {
        self.minZoomLevel = self.options.minZoomLevel;
      } else {
        self.minZoomLevel = self.options.scrollZoomIncrement * 2;
      }
      if (self.options.scrollZoom) {
        self.zoomContainer.add(self.$elem).bind('mousewheel DOMMouseScroll MozMousePixelScroll', function (e) {
          // in IE there is issue with firing of mouseleave - So check whether still scrolling
          // and on mouseleave check if scrolllock
          self.scrollLock = true;
          clearTimeout($.data(this, 'timer'));
          $.data(this, 'timer', setTimeout(function () {
            self.scrollLock = false;
            //do something
          }, 250));
          var theEvent = e.originalEvent.wheelDelta || e.originalEvent.detail * -1;
          e.stopImmediatePropagation();
          e.stopPropagation();
          e.preventDefault();
          if (theEvent / 120 > 0) {
            //scrolling up
            if (self.currentZoomLevel >= self.minZoomLevel) {
              self.changeZoomLevel(self.currentZoomLevel - self.options.scrollZoomIncrement);
            }
          } else {
            //scrolling down
            if (self.options.maxZoomLevel) {
              if (parseFloat(self.currentZoomLevel) + parseFloat(self.options.scrollZoomIncrement) <= self.options.maxZoomLevel) {
                self.changeZoomLevel(parseFloat(self.currentZoomLevel) + self.options.scrollZoomIncrement);
              } else {
                self.changeZoomLevel(parseFloat(self.options.maxZoomLevel));
              }
            } else {
              //andy
              self.changeZoomLevel(parseFloat(self.currentZoomLevel) + self.options.scrollZoomIncrement);
            }
          }
          return false;
        });
      }
    },

    setElements: function (type) {
      var self = this;
      if (!self.options.zoomEnabled) {
        return false;
      }
      if (type == 'show') {
        if (self.isWindowSet) {
          if (self.options.zoomType == 'window') {
            self.showHideWindow('show');
          }
          if (self.options.showLens) {
            self.showHideLens('show');
          }
          if (self.options.tint && self.options.zoomType != 'inner') {
            self.showHideTint('show');
          }
        }
      }
      if (type == 'hide') {
        if (self.options.zoomType == 'window') {
          self.showHideWindow('hide');
        }
        if (!self.options.tint) {
          self.showHideWindow('hide');
        }
        if (self.options.showLens) {
          self.showHideLens('hide');
        }
        if (self.options.tint) {
          self.showHideTint('hide');
        }
      }
    },

    setPosition: function (e) {
      var self = this;
      if (!self.options.zoomEnabled) {
        return false;
      }
      if (!self.$elem.is(':visible')) {
        self.zoomContainer.hide();
        return false;
      } else {
        self.zoomContainer.show();
      }
      // re-calc offset each time in case the image moves
      // this can be caused by other on page elements
      self.nzHeight = self.$elem.height();
      self.nzWidth = self.$elem.width();
      self.nzOffset = self.$elem.offset();

      //container fix
      self.zoomContainer.css({top: self.nzOffset.top});
      self.zoomContainer.css({left: self.nzOffset.left});
      self.mouseLeft = parseInt(e.pageX - self.nzOffset.left);
      self.mouseTop = parseInt(e.pageY - self.nzOffset.top);

      //Calculate the Location of the Lens

      //calculate the bound regions - but only if zoom window
      if (self.options.zoomType == 'window') {
        self.Etoppos = self.mouseTop < (self.zoomLens.height() / 2);
        self.Eboppos = self.mouseTop > (self.zoomContainer.height() - (self.zoomLens.height() / 2) - (self.options.lensBorderSize * 2));
        self.Eloppos = self.mouseLeft < (self.zoomLens.width() / 2);
        self.Eroppos = self.mouseLeft > (self.zoomContainer.width() - (self.zoomLens.width() / 2) - (self.options.lensBorderSize * 2));

        // if the mouse position of the slider is one of the outerbounds, then hide window and lens
        if (self.mouseLeft < 0 || self.mouseTop < 0 || self.mouseLeft > self.zoomContainer.width() || self.mouseTop > self.zoomContainer.height()) {
          self.setElements('hide');
        } else {
          if (self.options.showLens) {
            self.lensTopPos = Math.floor(self.mouseTop - self.zoomLens.height() / 2);
            self.lensLeftPos = Math.floor(self.mouseLeft - self.zoomLens.width() / 2);
          }
          //Top region
          if (self.Etoppos) {
            self.lensTopPos = 0;
          }
          //Left Region
          if (self.Eloppos) {
            self.lensLeftPos = 0;
          }
          //Set bottom and right region for window mode
          if (self.options.zoomType == 'window') {
            if (self.Eboppos) {
              self.lensTopPos = Math.max((self.zoomContainer.height()) - self.zoomLens.height() - (self.options.lensBorderSize * 2), 0);
            }
            if (self.Eroppos) {
              self.lensLeftPos = (self.zoomContainer.width() - (self.zoomLens.width()) - (self.options.lensBorderSize * 2));
            }
          }
          //set the css background position
          if (self.options.zoomType == 'window') {
            self.setWindowPosition(e);
          }
          if (self.options.showLens) {
            self.zoomLens.css({left: self.lensLeftPos + 'px', top: self.lensTopPos + 'px'})
          }
        }
      }
    },

    showHideWindow: function (change) {
      var self = this;
      if (change == 'show') {
        if (!self.isWindowActive) {
          if (self.options.zoomWindowFadeIn) {
            self.zoomWindow.stop(true, true, false).fadeIn(self.options.zoomWindowFadeIn);
          } else {
            self.zoomWindow.show();
          }
          self.isWindowActive = true;
        }
      } else if (change == 'hide') {
        if (self.isWindowActive) {
          if (self.options.zoomWindowFadeOut) {
            self.zoomWindow.stop(true, true).fadeOut(self.options.zoomWindowFadeOut, function () {
              if (self.loop) {
                //stop moving the zoom window when zoom window is faded out
                clearInterval(self.loop);
                self.loop = false;
              }
            });
          } else {
            self.zoomWindow.hide();
          }
          self.isWindowActive = false;
        }
      }
    },

    showHideLens: function (change) {
      var self = this;
      if (change == 'show') {
        if (!self.isLensActive) {
          if (self.options.lensFadeIn) {
            self.zoomLens.stop(true, true, false).fadeIn(self.options.lensFadeIn);
          } else {
            self.zoomLens.show();
          }
          self.isLensActive = true;
        }
      } else if (change == 'hide') {
        if (self.isLensActive) {
          if (self.options.lensFadeOut) {
            self.zoomLens.stop(true, true).fadeOut(self.options.lensFadeOut);
          } else {
            self.zoomLens.hide();
          }
          self.isLensActive = false;
        }
      }
    },

    showHideTint: function (change) {
      var self = this;
      if (change == 'show') {
        if (!self.isTintActive) {
          if (self.options.zoomTintFadeIn) {
            self.zoomTint.css({opacity: self.options.tintOpacity}).animate().stop(true, true).fadeIn('slow');
          } else {
            self.zoomTint.css({opacity: self.options.tintOpacity}).animate();
            self.zoomTint.show();
          }
          self.isTintActive = true;
        }
      } else if (change == 'hide') {
        if (self.isTintActive) {

          if (self.options.zoomTintFadeOut) {
            self.zoomTint.stop(true, true).fadeOut(self.options.zoomTintFadeOut);
          } else {
            self.zoomTint.hide();
          }
          self.isTintActive = false;
        }
      }
    },

    setWindowPosition: function (e) {
      var self = this;

      //WE CAN POSITION IN A CLASS - ASSUME THAT ANY STRING PASSED IS
      self.externalContainer = $('#' + self.options.zoomWindowPosition);
      self.externalContainerWidth = self.externalContainer.width();
      self.externalContainerHeight = self.externalContainer.height();
      self.externalContainerOffset = self.externalContainer.offset();

      self.windowOffsetTop = self.externalContainerOffset.top;//DONE - 1
      self.windowOffsetLeft = self.externalContainerOffset.left; //DONE 1, 2, 3, 4, 16

      self.isWindowSet = true;

      if (self.options.rotationAngle == 0 || self.options.rotationAngle == 180) {
        self.windowOffsetTop = self.windowOffsetTop + self.options.zoomWindowOffety;
        self.windowOffsetLeft = self.windowOffsetLeft + self.options.zoomWindowOffetx;
      } else if (self.options.rotationAngle == 90 || self.options.rotationAngle == 270) {
        var fix = (self.zoomWindow.width() - self.zoomWindow.height()) / 2;
        self.windowOffsetTop = self.windowOffsetTop + self.options.zoomWindowOffety + fix;
        self.windowOffsetLeft = self.windowOffsetLeft + self.options.zoomWindowOffetx - fix;
      }

      self.zoomWindow.css({top: self.windowOffsetTop});
      self.zoomWindow.css({left: self.windowOffsetLeft});

      var calculatedTopPosition, calculatedLeftPosition, maxHeightPosition, maxWidthPosition;
      if (self.options.rotationAngle == 0 || self.options.rotationAngle == 180) {
        calculatedTopPosition = (e.pageY - self.nzOffset.top) * self.heightRatio - self.zoomWindow.height() / 2;
        calculatedLeftPosition = (e.pageX - self.nzOffset.left) * self.widthRatio - self.zoomWindow.width() / 2;
      } else if (self.options.rotationAngle == 90 || self.options.rotationAngle == 270) {
        calculatedTopPosition = (e.pageY - self.nzOffset.top) * self.heightRatio - self.zoomWindow.width() / 2;
        calculatedLeftPosition = (e.pageX - self.nzOffset.left) * self.widthRatio - self.zoomWindow.height() / 2;
      }

      maxHeightPosition = (self.largeHeight / self.currentZoomLevel - self.zoomWindow.height()) * (-1);
      maxWidthPosition = ((self.largeWidth / self.currentZoomLevel - self.zoomWindow.width()) * (-1));

      if (self.options.rotationAngle == 0) {
        if (self.Etoppos) {
          self.windowTopPos = 0;
        } else if (self.Eboppos) {
          self.windowTopPos = maxHeightPosition;
        } else {
          self.windowTopPos = calculatedTopPosition * -1;
        }
        if (self.Eloppos) {
          self.windowLeftPos = 0;
        } else if (self.Eroppos) {
          self.windowLeftPos = maxWidthPosition;
        } else {
          self.windowLeftPos = calculatedLeftPosition * -1;
        }
      } else if (self.options.rotationAngle == 90) {
        if (self.Etoppos) {
          self.windowLeftPos = 0;
        } else if (self.Eboppos) {
          self.windowLeftPos = maxWidthPosition;
        } else {
          self.windowLeftPos = calculatedTopPosition * -1;
        }
        if (self.Eloppos) {
          self.windowTopPos = maxHeightPosition;
        } else if (self.Eroppos) {
          self.windowTopPos = 0;
        } else {
          self.windowTopPos = calculatedLeftPosition + maxHeightPosition;
        }
      } else if (self.options.rotationAngle == 180) {
        if (self.Etoppos) {
          self.windowTopPos = maxHeightPosition;
        } else if (self.Eboppos) {
          self.windowTopPos = 0;
        } else {
          self.windowTopPos = maxHeightPosition + calculatedTopPosition;
        }
        if (self.Eloppos) {
          self.windowLeftPos = maxWidthPosition;
        } else if (self.Eroppos) {
          self.windowLeftPos = 0;
        } else {
          self.windowLeftPos = maxWidthPosition + calculatedLeftPosition;
        }
      } else if (self.options.rotationAngle == 270) {
        if (self.Etoppos) {
          self.windowLeftPos = maxWidthPosition;
        } else if (self.Eboppos) {
          self.windowLeftPos = 0;
        } else {
          self.windowLeftPos = calculatedTopPosition + maxWidthPosition;
        }
        if (self.Eloppos) {
          self.windowTopPos = 0;
        } else if (self.Eroppos) {
          self.windowTopPos = maxHeightPosition;
        } else {
          self.windowTopPos = calculatedLeftPosition * -1
        }
      }

      //stops micro movements
      if (self.fullheight) {
        if (self.options.rotationAngle == 0 || self.options.rotationAngle == 180) self.windowTopPos = 0;
        if (self.options.rotationAngle == 90 || self.options.rotationAngle == 270) self.windowLeftPos = 0;
      }
      if (self.fullwidth) {
        if (self.options.rotationAngle == 0 || self.options.rotationAngle == 180) self.windowLeftPos = 0;
        if (self.options.rotationAngle == 90 || self.options.rotationAngle == 270) self.windowTopPos = 0;
      }

      //set the css background position
      if (self.options.zoomType == 'window') {
        if (self.zoomLock == 1) {
          //overrides for images not zoomable
          if (self.widthRatio <= 1) {
            self.windowLeftPos = 0;
          }
          if (self.heightRatio <= 1) {
            self.windowTopPos = 0;
          }
        }

        //set the zoomwindow background position
        if (self.options.easing) {
          console.warn('Easing not supported');
        } else {
          if (self.changeBgSize) {
            if (self.nzHeight > self.nzWidth) {
              self.zoomWindow.css({'background-size': self.largeWidth / self.newvalueheight + 'px ' + self.largeHeight / self.newvalueheight + 'px'});
            } else {
              if ((self.largeHeight / self.newvaluewidth) < self.options.zoomWindowHeight) {
                self.zoomWindow.css({'background-size': self.largeWidth / self.newvaluewidth + 'px ' + self.largeHeight / self.newvaluewidth + 'px'});
              } else {
                self.zoomWindow.css({'background-size': self.largeWidth / self.newvalueheight + 'px ' + self.largeHeight / self.newvalueheight + 'px'});
              }
            }
            self.changeBgSize = false;
          }
          self.zoomWindow.css({backgroundPosition: self.windowLeftPos + 'px ' + self.windowTopPos + 'px'});
        }
      }
    },

    setTintPosition: function (e) {
      var self = this;
      self.nzOffset = self.$elem.offset();
      self.tintpos = String(((e.pageX - self.nzOffset.left) - (self.zoomLens.width() / 2)) * (-1));
      self.tintposy = String(((e.pageY - self.nzOffset.top) - self.zoomLens.height() / 2) * (-1));
      if (self.Etoppos) {
        self.tintposy = 0;
      }
      if (self.Eloppos) {
        self.tintpos = 0;
      }
      if (self.Eboppos) {
        self.tintposy = (self.nzHeight - self.zoomLens.height() - (self.options.lensBorderSize * 2)) * (-1);
      }
      if (self.Eroppos) {
        self.tintpos = ((self.nzWidth - self.zoomLens.width() - (self.options.lensBorderSize * 2)) * (-1));
      }
      if (self.options.tint) {
        //stops micro movements
        if (self.fullheight) {
          self.tintposy = 0;
        }
        if (self.fullwidth) {
          self.tintpos = 0;
        }
        self.zoomTintImage.css({'left': self.tintpos + 'px'});
        self.zoomTintImage.css({'top': self.tintposy + 'px'});
      }
    },

    swaptheimage: function (smallimage, largeimage) {
      var self = this;
      var newImg = new Image();

      if (self.options.loadingIcon) {
        self.spinner = $('<div style="background: url(\"' + self.options.loadingIcon + '\") no-repeat center; height:' + self.nzHeight + 'px; width:' + self.nzWidth + 'px; z-index: 2000; position: absolute; background-position: center center;"></div>');
        self.$elem.after(self.spinner);
      }
      self.options.onImageSwap(self.$elem);
      newImg.onload = function () {
        self.largeWidth = newImg.width;
        self.largeHeight = newImg.height;
        self.zoomImage = largeimage;
        self.zoomWindow.css({'background-size': self.largeWidth + 'px ' + self.largeHeight + 'px'});
        self.swapAction(smallimage, largeimage);
      };
      newImg.src = largeimage;
    },

    swapAction: function (smallimage, largeimage) {
      var self = this;
      var newImg2 = new Image();
      newImg2.onload = function () {
        //re-calculate values
        self.nzHeight = newImg2.height;
        self.nzWidth = newImg2.width;
        self.options.onImageSwapComplete(self.$elem);
        self.doneCallback();
      };
      newImg2.src = smallimage;
      //reset the zoomlevel to that initially set in options
      self.currentZoomLevel = self.options.zoomLevel;
      self.options.maxZoomLevel = false;
      if (self.options.zoomType == 'window') {
        self.zoomWindow.css({backgroundImage: 'url("' + largeimage + '")'});
      }
      self.currentImage = largeimage;
      if (self.options.imageCrossfade) {
        var oldImg = self.$elem;
        var newImg = oldImg.clone();
        self.$elem.attr('src', smallimage);
        self.$elem.after(newImg);
        newImg.stop(true).fadeOut(self.options.imageCrossfade, function () {
          $(this).remove();
        });
        //remove any attributes on the cloned image so we can resize later
        self.$elem.width('auto').removeAttr('width');
        self.$elem.height('auto').removeAttr('height');
        oldImg.fadeIn(self.options.imageCrossfade);
        if (self.options.tint && self.options.zoomType != 'inner') {
          var oldImgTint = self.zoomTintImage;
          var newImgTint = oldImgTint.clone();
          self.zoomTintImage.attr('src', largeimage)
          self.zoomTintImage.after(newImgTint);
          newImgTint.stop(true).fadeOut(self.options.imageCrossfade, function () {
            $(this).remove();
          });
          oldImgTint.fadeIn(self.options.imageCrossfade);
          //resize the tint window
          self.zoomTint.css({height: self.$elem.height()});
          self.zoomTint.css({width: self.$elem.width()});
        }
        self.zoomContainer.css('height', self.$elem.height());
        self.zoomContainer.css('width', self.$elem.width());
        if (self.options.imageCrossfade) {
          self.zoomWrap.css('height', self.$elem.height());
          self.zoomWrap.css('width', self.$elem.width());
        }
      } else {
        self.$elem.attr('src', smallimage);
        if (self.options.tint) {
          self.zoomTintImage.attr('src', largeimage);
          //self.zoomTintImage.attr('width',elem.data('image'));
          self.zoomTintImage.attr('height', self.$elem.height());
          //self.zoomTintImage.attr('src') = elem.data('image');
          self.zoomTintImage.css({height: self.$elem.height()});
          self.zoomTint.css({height: self.$elem.height()});
        }
        self.zoomContainer.css('height', self.$elem.height());
        self.zoomContainer.css('width', self.$elem.width());
        if (self.options.imageCrossfade) {
          self.zoomWrap.css('height', self.$elem.height());
          self.zoomWrap.css('width', self.$elem.width());
        }
      }
      if (self.options.constrainType) {
        //This will contrain the image proportions
        if (self.options.constrainType == 'height') {
          self.zoomContainer.css('height', self.options.constrainSize);
          self.zoomContainer.css('width', 'auto');
          if (self.options.imageCrossfade) {
            self.zoomWrap.css('height', self.options.constrainSize);
            self.zoomWrap.css('width', 'auto');
            self.constwidth = self.zoomWrap.width();
          } else {
            self.$elem.css('height', self.options.constrainSize);
            self.$elem.css('width', 'auto');
            self.constwidth = self.$elem.width();
          }
          if (self.options.tint) {
            self.tintContainer.css('height', self.options.constrainSize);
            self.tintContainer.css('width', self.constwidth);
            self.zoomTint.css('height', self.options.constrainSize);
            self.zoomTint.css('width', self.constwidth);
            self.zoomTintImage.css('height', self.options.constrainSize);
            self.zoomTintImage.css('width', self.constwidth);
          }
        }
        if (self.options.constrainType == 'width') {
          self.zoomContainer.css('height', 'auto');
          self.zoomContainer.css('width', self.options.constrainSize);
          if (self.options.imageCrossfade) {
            self.zoomWrap.css('height', 'auto');
            self.zoomWrap.css('width', self.options.constrainSize);
            self.constheight = self.zoomWrap.height();
          } else {
            self.$elem.css('height', 'auto');
            self.$elem.css('width', self.options.constrainSize);
            self.constheight = self.$elem.height();
          }
          if (self.options.tint) {
            self.tintContainer.css('height', self.constheight);
            self.tintContainer.css('width', self.options.constrainSize);
            self.zoomTint.css('height', self.constheight);
            self.zoomTint.css('width', self.options.constrainSize);
            self.zoomTintImage.css('height', self.constheight);
            self.zoomTintImage.css('width', self.options.constrainSize);
          }
        }
      }
    },

    doneCallback: function () {
      var self = this;
      if (self.options.loadingIcon) {
        self.spinner.hide();
      }
      self.nzOffset = self.$elem.offset();
      self.nzWidth = self.$elem.width();
      self.nzHeight = self.$elem.height();

      // reset the zoomlevel back to default
      self.currentZoomLevel = self.options.zoomLevel;

      //ratio of the large to small image
      self.widthRatio = self.largeWidth / self.nzWidth;
      self.heightRatio = self.largeHeight / self.nzHeight;

      //NEED TO ADD THE LENS SIZE FOR ROUND
      // adjust images less than the window height
      if (self.options.zoomType == 'window') {
        if (self.nzHeight < self.options.zoomWindowWidth / self.widthRatio) {
          lensHeight = self.nzHeight;
        } else {
          lensHeight = String((self.options.zoomWindowHeight / self.heightRatio))
        }
        if (self.options.zoomWindowWidth < self.options.zoomWindowWidth) {
          lensWidth = self.nzWidth;
        } else {
          lensWidth = (self.options.zoomWindowWidth / self.widthRatio);
        }
        if (self.zoomLens) {
          self.zoomLens.css('width', lensWidth);
          self.zoomLens.css('height', lensHeight);
        }
      }
    },

    getCurrentImage: function () {
      var self = this;
      return self.zoomImage;
    },

    getGalleryList: function () {
      var self = this;
      //loop through the gallery options and set them in list for fancybox
      self.gallerylist = [];
      if (self.options.gallery) {
        $('#' + self.options.gallery + ' a').each(function () {
          var img_src = '';
          if ($(this).data('zoom-image')) {
            img_src = $(this).data('zoom-image');
          } else if ($(this).data('image')) {
            img_src = $(this).data('image');
          }
          //put the current image at the start
          if (img_src == self.zoomImage) {
            self.gallerylist.unshift({
              href: '' + img_src + '',
              title: $(this).find('img').attr('title')
            });
          } else {
            self.gallerylist.push({
              href: '' + img_src + '',
              title: $(this).find('img').attr('title')
            });
          }
        });
      }
      //if no gallery - return current image
      else {
        self.gallerylist.push({
          href: '' + self.zoomImage + '',
          title: $(this).find('img').attr('title')
        });
      }
      return self.gallerylist;
    },

    changeZoomLevel: function (value) {
      var self = this;
      //flag a zoom, so can adjust the easing during setPosition
      self.scrollingLock = true;
      //round to two decimal places
      self.newvalue = parseFloat(value).toFixed(2);
      newvalue = parseFloat(value).toFixed(2);

      var largeHeight, largeWidth;
      if (self.options.rotationAngle == 0 || self.options.rotationAngle == 180) {
        largeHeight = self.largeHeight;
        largeWidth = self.largeWidth;
      } else if (self.options.rotationAngle == 90 || self.options.rotationAngle == 270) {
        largeHeight = self.largeWidth;
        largeWidth = self.largeHeight;
      }
      var zContainerWidth = self.zoomContainer.width();
      var zContainerHeight = self.zoomContainer.height();

      //maxwidth & maxheight of the image
      maxheightnewvalue = largeHeight / self.options.zoomWindowHeight;
      maxwidthtnewvalue = largeWidth / self.options.zoomWindowWidth;

      if (maxheightnewvalue <= newvalue) {
        self.heightRatio = (largeHeight / maxheightnewvalue) / zContainerHeight;
        self.newvalueheight = maxheightnewvalue;
        self.fullheight = true;
      } else {
        self.heightRatio = (largeHeight / newvalue) / zContainerHeight;
        self.newvalueheight = newvalue;
        self.fullheight = false;
      }
      if (maxwidthtnewvalue <= newvalue) {
        self.widthRatio = (largeWidth / maxwidthtnewvalue) / zContainerWidth;
        self.newvaluewidth = maxwidthtnewvalue;
        self.fullwidth = true;
      } else {
        self.widthRatio = (largeWidth / newvalue) / zContainerWidth;
        self.newvaluewidth = newvalue;
        self.fullwidth = false;
      }

      self.zoomLock = 0;
      self.changeZoom = true;
      //if lens height is less than image height (-0.1px prevent bugs when difference is less than a pixel)
      if (((self.options.zoomWindowHeight) / self.heightRatio) - 0.1 <= zContainerHeight) {
        self.currentZoomLevel = self.newvalueheight;
        self.changeBgSize = true;
        self.zoomLens.css({height: String((self.options.zoomWindowHeight) / self.heightRatio) + 'px'})
      }
      //if lens width is less than image width (-0.1px prevent bugs when difference is less than a pixel)
      if ((self.options.zoomWindowWidth / self.widthRatio) - 0.1 <= zContainerWidth) {
        if (self.newvaluewidth > self.newvalueheight) {
          self.currentZoomLevel = self.newvaluewidth;
        }
        self.changeBgSize = true;
        self.zoomLens.css({width: String((self.options.zoomWindowWidth) / self.widthRatio) + 'px'})
      }
      //sets the boundry change, called in setWindowPos
      self.setPosition(self.currentLoc);
    },

    closeAll: function () {
      if (self.zoomWindow) {
        self.zoomWindow.hide();
      }
      if (self.zoomLens) {
        self.zoomLens.hide();
      }
      if (self.zoomTint) {
        self.zoomTint.hide();
      }
    },

    changeState: function (value) {
      var self = this;
      if (value == 'enable') {
        self.options.zoomEnabled = true;
      }
      if (value == 'disable') {
        self.options.zoomEnabled = false;
      }
    }
  };

  $.fn.elevateZoom = function (options) {
    return this.each(function () {
      var elevate = Object.create(ElevateZoom);
      elevate.init(options, this);
      $.data(this, 'elevateZoom', elevate);
    });
  };

  $.fn.elevateZoom.options = {
    zoomActivation: 'hover', // Can also be click (PLACEHOLDER FOR NEXT VERSION)
    zoomEnabled: true, //false disables zoomwindow from showing
    preloading: 1, //by default, load all the images, if 0, then only load images after activated (PLACEHOLDER FOR NEXT VERSION)
    zoomLevel: 1, //default zoom level of image
    scrollZoom: false, //allow zoom on mousewheel, true to activate
    scrollZoomIncrement: 0.1,  //steps of the scrollzoom
    minZoomLevel: false,
    maxZoomLevel: false,
    easing: false,
    easingAmount: 12,
    lensSize: 200,
    zoomWindowWidth: 400,
    zoomWindowHeight: 400,
    zoomWindowOffetx: 0,
    zoomWindowOffety: 0,
    zoomWindowPosition: 1,
    zoomWindowBgColour: '#fff',
    rotationAngle: 0,
    lensFadeIn: false,
    lensFadeOut: false,
    debug: false,
    zoomWindowFadeIn: false,
    zoomWindowFadeOut: false,
    zoomWindowAlwaysShow: false,
    zoomTintFadeIn: false,
    zoomTintFadeOut: false,
    borderSize: 4,
    showLens: true,
    borderColour: '#888',
    lensBorderSize: 1,
    lensBorderColour: '#000',
    lensShape: 'square', //can be 'round'
    zoomType: 'window', //window is default. 'lens' and 'inner' are not available in this edition (support removed as far as no implementation of rotationAngle)
    containLensZoom: false,
    lensColour: 'white', //colour of the lens background
    lensOpacity: 0.4, //opacity of the lens
    lenszoom: false,
    tint: false, //enable the tinting
    tintColour: '#333', //default tint color, can be anything, red, #ccc, rgb(0,0,0)
    tintOpacity: 0.4, //opacity of the tint
    gallery: false,
    galleryActiveClass: 'zoomGalleryActive',
    imageCrossfade: false,
    constrainType: false, //width or height
    constrainSize: false, //in pixels the dimensions you want to constrain on
    loadingIcon: false, //http://www.example.com/spinner.gif
    cursor: 'default', // user should set to what they want the cursor as, if they have set a click function
    responsive: true,
    onComplete: $.noop,
    onDestroy: function () {
    },
    onZoomedImageLoaded: function () {
    },
    onImageSwap: $.noop,
    onImageSwapComplete: $.noop
  };
})(jQuery, window, document);
