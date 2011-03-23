
var slideshow;
document.addEventListener("readystatechange", function() {
    if (document.readyState == "complete") {
        slideshow = new Slideshow();
        prettyPrint();
    }
});

function Slideshow() {
    var self = this;

    document.addEventListener("keydown", function(event) {
        self.keyHandler(event);
    });

    document.addEventListener("click", function(event) {
        self.clickHandler(event);
    });

    this.slides = document.querySelectorAll("section.slide");

    console.log("Number of slides: %d", this.slides.length);

    this.seek(0);

    setInterval(function() { self.checkLocationHash(); }, 50);
}

Slideshow.prototype.slides = null;

Slideshow.prototype.currentSlide = null;

Slideshow.prototype.__defineGetter__("currentIndex", function() {
    for (var i = 0; i < this.slides.length; i++) {
        if (this.slides[i] == this.currentSlide) {
            return i;
        }
    }
    return -1;
});

Slideshow.prototype.checkLocationHash = function() {
    if (window.location.hash) {
        var match = window.location.hash.match(/#(\d+)/);
        if (match) {
            var hashSlide = parseInt(match[1]);
            if (hashSlide != this.currentIndex) {
                this.seek(hashSlide);
            }
        }
    }
};

Slideshow.prototype.clickHandler = function(event) {
    //console.log("click event: ", event);
    if (event.button == 0) {
        if (event.ctrlKey) {
            this.prev();
        } else {
            this.next();
        }
    }
};

Slideshow.prototype.keyHandler = function(event) {
    //console.log("event.keyCode = " + event.keyCode);
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
        element.originalDisplayStyle = getComputedStyle(element).getPropertyValue("display");
    }
    element.style.display = "none";
};

Slideshow.prototype.show = function(element) {
    element.style.display = element.originalDisplayStyle;
};

Slideshow.prototype.seek = function(index) {
    if (index < 0 || index >= this.slides.length || this.slides.length < 1) {
        return;
    }

    for (var i = 0; i < this.slides.length; i++) {
        if (i == index) {
            this.show(this.slides[i]);
            this.currentSlide = this.slides[i];
        } else {
            this.hide(this.slides[i]);
        }
    }
};

Slideshow.prototype.next = function() {
    //this.seek(this.currentIndex + 1);
    var nextSlide = this.currentIndex + 1;
    if (nextSlide < this.slides.length) {
        window.location.hash = "#" + nextSlide;
    }
};

Slideshow.prototype.prev = function() {
    //this.seek(this.currentIndex - 1);
    var prevSlide = this.currentIndex - 1;
    if (prevSlide >= 0) {
        window.location.hash = "#" + prevSlide;
    }
};

