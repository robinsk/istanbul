
var slideshow;
document.addEventListener("readystatechange", function() {
    if (document.readyState == "complete") {
        slideshow = new Slideshow();
        slideshow.start();
    }
});

function Slideshow() {
}

Slideshow.prototype.slides = null;

Slideshow.prototype.currentSlide = null;

Slideshow.prototype.__defineGetter__("currentIndex", function() {
    return this.slides.indexOf(this.currentSlide);
});

Slideshow.prototype.start = function() {
    var self = this;
    document.addEventListener("keydown", function(event) {
        self.keyHandler(event);
    });
};

Slideshow.prototype.keyHandler = function(event) {
    //console.log("event.keyCode = " + event.keyCode);
    console.log("event: ", event);
    
    switch (event.keyCode) {
        case 13: // enter
        case 32: // space
        case 34: // page down
        case 39: // right arrow
        case 40: // down arrow
            this.next();
            break;
        case  8: // backspace
        case 33: // page up
        case 37: // left arrow
        case 38: // up arrow
            this.prev();
            break;
        case 36: // home
            this.seek(0);
            break;
        case 35: // end
            this.seek(this.slides.length - 1);
            break;
    }
};

Slideshow.prototype.hide = function(element) {
    if (typeof element.originalDisplayStyle == "undefined") {
        element.originalDisplayStyle = element.style.display;
    }
    element.style.display = "none";
});

Slideshow.prototype.show = function(element) {
    element.style.display = element.originalDisplayStyle;
});

Slideshow.prototype.seek = function(index) {
    if (index < 0 || index >= this.slides.length) {
        return;
    }
    
    if (this.currentSlide) {
    
    }
};

Slideshow.prototype.next = function() {
    this.seek(this.currentIndex++);
};

Slideshow.prototype.prev = function() {
    this.seek(this.currentIndex--);
};
