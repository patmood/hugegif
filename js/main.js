// MODELS
var Link = Backbone.Model.extend({
  initialize: function(obj) {
        // console.log("Created: ",obj.title);
      }
    });

// COLLECTIONS
var LinksList = Backbone.Collection.extend({
  initialize: function(subreddit){
    this.subreddit = subreddit
  },
  model: Link,
    subreddit: 'gif', // Default sub
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
        if(link.url.match(/\.gif$/ig)){
          collection.push(link);
        }else if(link.url.match(/^.+imgur\.com\/(\w+$)/ig) && !link.url.match(/^.+imgur\.com\/a\//ig)){
          var imgurId = (/^.+imgur\.com\/(\w+$)/ig).exec(link.url)[1];
          link.url = 'http://i.imgur.com/'+imgurId+'.gif';
          collection.push(link);
        }
      }
      return collection;
    },

    url: function() {
      return "http://www.reddit.com/r/" + this.subreddit + "/.json?limit=10&after=&jsonp=?";
    }
  });

var linksList = new LinksList();

// VIEWS
var LinkView = Backbone.View.extend({
  el: '#container',
  initialize: function(){
    this.render();
  },
  render: function(id){
    var link = linksList.find(function(model) {
      return model.get('id') === id;
    })
    console.log('link:',link);
    if(typeof link === 'undefined') return;
    var template = _.template( $('#tpl-link').html(), {link: link} );
    console.log(template);

    this.$el.html(template);
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

// ROUTER
var AppRouter = Backbone.Router.extend({
  routes:{
    "":"index",
    "r/:sub":"subreddit",
    "r/:sub/:id":"link",
    "*path":"notFound"
  },
  index: function(){
    indexView.render();
  },
  subreddit: function(sub){
    linksListView.render(sub);
  },
  link: function(sub, id){
    console.log(sub,'/',id);
    linkView.render(id);
  },
  notFound: function(){
    notFoundView.render();
  }

});

// GO BABY GO!
var router = new AppRouter();

Backbone.history.start();
