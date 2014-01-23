// MODELS
var Link = Backbone.Model.extend({
  initialize: function(obj) {
  }
});

// COLLECTIONS
var LinksList = Backbone.Collection.extend({
  initialize: function(subreddit, after){
    this.subreddit = subreddit
    this.after = after
  },
  model: Link,
  sync: function(method, model, options) {
    var params = _.extend({
      type: 'GET',
      dataType: 'jsonp',
      url: model.url(),
      processData: false
    }, options);

    return $.ajax(params);
  },
  parse: function(response) {
    var collection = []
    for(var i = 0; i < response.data.children.length; i++){
      var link = response.data.children[i].data;
      // Only add gifs
      if(link.url.match(/\.gif$/ig)){
        collection.push(link);
      }else if(link.url.match(/^.+imgur\.com\/(\w+$)/ig) && !link.url.match(/^.+imgur\.com\/a\//ig)){
        var imgurId = (/^.+imgur\.com\/(\w+$)/ig).exec(link.url)[1];
        link.url = 'http://i.imgur.com/'+imgurId+'.gif';
        collection.push(link);
      }
    }
    // Add next and previous links
    for(var i = 0; i < collection.length; i++){
      if(i + 1 < collection.length){
        collection[i].next = collection[i+1].id;
      }
      if(i - 1 > 0){
        collection[i].prev = collection[i-1].id;
      }
    }
    return collection;
  },
  url: function() {
    return "http://www.reddit.com/r/" + this.subreddit + "/.json?limit=10&after=" + this.after + "&jsonp=?";
  }
});

var linksList = new LinksList();

// VIEWS
var LinkView = Backbone.View.extend({
  el: '#container',
  initialize: function(){
    this.render();
  },
  render: function(sub, id){
    this.model = linksList.find(function(model) {
      return model.get('id') === id;
    })
    if(typeof this.model === 'undefined'){
      console.log('fetch model here');
      return;
    }
    var template = _.template( $('#tpl-link').html(), {link: this.model} );
    this.$el.html(template);
  },
  events: {
    'keydown' : 'keyNav',
    'click #prev' : 'prevLink',
    'click #next' : 'nextLink',
    'click #hugegif' : 'nextLink'
  },
  keyNav: function(e){
    var key = e.which
    console.log(e);
    if(key == 32) console.log("space");
    else if(key === 39) console.log("right");
    else if(key === 37) console.log("left");
  },
  prevLink: function(){
    if( this.model.get('prev') ){
      router.navigate('/r/' + this.model.get('subreddit') + '/' + this.model.get('prev'), {trigger: true});
    }
  },
  nextLink: function(){
    if( this.model.get('next') ){
      router.navigate('/r/' + this.model.get('subreddit') + '/' + this.model.get('next'), {trigger: true});
    }
  }


});

var LinksListView = Backbone.View.extend({
  el: '#container',
  initialize: function(subreddit) {
    if(typeof subreddit === 'undefined' || subreddit === '') return;
    this.render(subreddit);
  },
  render: function(subreddit) {
    var _this = this
    linksList = new LinksList(subreddit);
    linksList.fetch({
      success: function(linksList){
        var template = _.template( $('#tpl-links-list').html(), {links: linksList.models} );
        _this.$el.html(template);
      },
      error: function(){
        router.notFound();
      }
    });
  }
});

var IndexView = Backbone.View.extend({
  el: '#container',
  initialize: function(){
    this.render();
  },
  render: function(){
    var template = _.template( $('#tpl-index').html() );
    this.$el.html(template);
  }
});

var ImgurView = Backbone.View.extend({
  el: '#container',
  render: function(id){
    var image = id;
    var template = _.template( $('#tpl-imgur-link').html(), { image: image });
    this.$el.html(template);
  }
})

var NotFoundView = Backbone.View.extend({
  el: '#container',
  render: function(){
    var template = _.template( $('#tpl-not-found').html() );
    this.$el.html(template);
  }
});

var linkView = new LinkView();
var linksListView = new LinksListView();
var indexView = new IndexView();
var notFoundView = new NotFoundView();
var imgurView = new ImgurView();

// ROUTER
var AppRouter = Backbone.Router.extend({
  routes:{
    "":"index",
    "r/:sub":"subreddit",
    "r/:sub/:id":"link",
    ":imgur_id":"imgur",
    "*path":"notFound"
  },
  index: function(){
    indexView.render();
  },
  subreddit: function(sub){
    linksListView.render(sub);
  },
  link: function(sub, id){
    linkView.render(sub, id);
  },
  imgur: function(imgur_id){
    imgurView.render(imgur_id);
  },
  notFound: function(){
    notFoundView.render();
  }

});

// GO BABY GO!
var router = new AppRouter();

Backbone.history.start();
