// MODELS
var Link = Backbone.Model.extend({
  initialize: function(obj){
  }
});

var Imgur = Backbone.Model.extend({
  sync: function(method, model, options) {
    var params =  _.extend({
      type: 'GET',
      url: 'https://api.imgur.com/3/image/' + this.get('id'),
      headers: { 'Authorization': 'Client-ID 2b577f722a2e8e9' }
      }, options)

    return $.ajax(params);
  },
  parse: function(response) {
    return response.data;
  }
});

// COLLECTIONS
var LinksList = Backbone.Collection.extend({
  initialize: function(obj){
    this.subreddit = obj.subreddit;
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
      if(i - 1 >= 0){
        collection[i].prev = collection[i-1].id;
      }
    }
    this.before = response.data.before;
    this.after = response.data.after;
    return collection;
  },
  url: function() {
    return "http://www.reddit.com/r/" + this.subreddit + "/.json?limit=100&after=" + this.after + "&jsonp=?";
  }
});

var linksList;

// VIEWS
var LinkView = Backbone.View.extend({
  el: '#container',
  initialize: function(obj){
    this.render();
    $('body').keydown(_.bind(this.keyNav, this));
  },
  render: function(){
    var _this = this;
    this.model = linksList.find(function(model) {
      return model.get('id') === _this.id;
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
    if(key == 32) this.nextLink(); // space
    else if(key === 39) this.nextLink(); // right
    else if(key === 37) this.prevLink(); // left
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
  initialize: function(obj) {
    this.subreddit = obj.subreddit;
    this.render();
  },
  render: function() {
    var _this = this;
    linksList = new LinksList({subreddit: this.subreddit});
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
    var template = _.template( $('#tpl-index').html(), favReddits );
    this.$el.html(template);
  },
  events: {
    'click .feature': 'featureSub'
  },
  featureSub: function(e){
    router.navigate(e.target.innerText, {trigger: true});
  }
});

var ImgurView = Backbone.View.extend({
  model: Imgur,
  el: '#container',
  initialize: function(obj){
    this.render();
  },
  render: function(){
    console.log('rendering imgur view...');
    var _this = this;
    var imgurObj = new Imgur({id: this.id});
    imgurObj.fetch({
      success: function(){
        var template = _.template( $('#tpl-imgur-link').html(), { image: imgurObj });
        _this.$el.html(template);
      },
      error: function(){
        router.notFound();
      }
    });
  }
})

var NotFoundView = Backbone.View.extend({
  el: '#container',
  initialize: function() {
    this.render();
  },
  render: function(){
    var template = _.template( $('#tpl-not-found').html() );
    this.$el.html(template);
  }
});


// ROUTER
var AppRouter = Backbone.Router.extend({
  routes:{
    '':'index',
    'r/:sub(/)':'subreddit',
    'r/:sub/:id(/)':'link',
    ':imgur_id':'imgur',
    '*path':'notFound'
  },
  index: function(){
    this.unbindAll();
    var indexView = new IndexView();
  },
  subreddit: function(sub){
    this.unbindAll();
    var linksListView = new LinksListView({subreddit: sub});
  },
  link: function(sub, id){
    this.unbindAll();
    var linkView = new LinkView({sub: sub, id: id});
  },
  imgur: function(imgur_id){
    this.unbindAll();
    var imgurView = new ImgurView({id: imgur_id});
  },
  notFound: function(){
    this.unbindAll();
    var notFoundView = new NotFoundView();
  },
  unbindAll: function(){
    $('#container').unbind();
    $("body").unbind('keydown');
  }

});

// GO BABY GO!
var router = new AppRouter();
var favReddits = [
  '/r/gif',
  '/r/reactiongifs',
  '/r/animalsbeingjerks',
  '/r/thestopgirl'
]

Backbone.history.start();
