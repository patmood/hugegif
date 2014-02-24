// MODELS
var Link = Backbone.Model.extend({
  initialize: function(obj){
  }
, sync: function(method, model, options) {
    var params = _.extend({
      type: 'GET'
    , dataType: 'jsonp'
    , jsonp: 'jsonp'
    , url: this.url()
    , processData: false
    }, options)

    console.log('fetching model')
    return $.ajax(params)
  }
, parse: function(response){
    console.log("parsing!")
    var res
    // If parsing a response from reddit, it will be an array, otherwise it is json from the collection
    if (Object.prototype.toString.call(response) === '[object Array]'){
      res = parseGifObject(response[0].data.children[0].data)
      linksList.add(res)
    } else {
      res = response
    }
    return res
  }
, url: function() {
    return "http://www.reddit.com/r/" + this.get('sub') + "/comments/" + this.id + "/.json"
  }
})

var Imgur = Backbone.Model.extend({
  sync: function(method, model, options) {
    var params =  _.extend({
      type: 'GET'
    , url: 'https://api.imgur.com/3/image/' + this.get('id')
    , headers: { 'Authorization': 'Client-ID 2b577f722a2e8e9' }
      }, options)

    return $.ajax(params)
  }
, parse: function(response) {
    return response.data
  }
})

// COLLECTIONS
var LinksList = Backbone.Collection.extend({
  initialize: function(obj){
    this.subreddit = obj.subreddit
    this.after = obj.after
  }
, model: Link
, sync: function(method, model, options) {
    var params = _.extend({
      type: 'GET'
    , dataType: 'jsonp'
    , jsonp: 'jsonp'
    , url: this.url()
    , processData: false
    }, options)

    console.log('fetching for collection')
    return $.ajax(params)
  }
, parse: function(response) {
    console.log('parsing collection')
    var collection = []
    this.newest = undefined
    for(var i = 0; i < response.data.children.length; i++){
      var link = response.data.children[i].data
      link = parseGifObject(link)

      if(link && !this.newest) this.newest = link.id
      if(link) collection.push(link)
    }

    // TODO: fix next/prev links when adding to collection. Possibly not adding properly.

    // Add next and previous links
    collection[0].prev = this.lastLink
    for(var i = 0; i < collection.length; i++){
      if(i + 1 < collection.length){
        collection[i].next = collection[i+1].id
      }
      if(i - 1 >= 0){
        collection[i].prev = collection[i-1].id
      }
    }

    this.before = response.data.before
    this.after = response.data.after
    this.lastLink = collection[collection.length-1].id

    return collection
  }
, url: function() {
    return "http://www.reddit.com/r/" + this.subreddit + "/.json?limit=" + fetchLimit + "&after=" + this.after
  }
})

// Helper to filter out and sanitize links
var parseGifObject = function(obj){
  if(obj.url.match(/\.gif$/ig)){
    return obj
  }else if(obj.url.match(/^.+imgur\.com\/(\w+$)/ig) && !obj.url.match(/^.+imgur\.com\/a\//ig)){
    var imgurId = (/^.+imgur\.com\/(\w+$)/ig).exec(obj.url)[1]
    obj.url = 'http://i.imgur.com/'+imgurId+'.gif'
    return obj
  }else if(obj.url.match(/hugegif.com/ig) && !obj.url.match(/\/r\//igi)){
    // handle hugegif links that go to imgur
    var imgurId = obj.url.match(/\w+$/)
    obj.url = 'http://i.imgur.com/'+imgurId+'.gif'
    return obj
  }
}

// VIEWS
var LinkView = Backbone.View.extend({
  el: '#container'
, initialize: function(){
    $('body').keydown(_.bind(this.keyNav, this))
  }
, render: function(model){
    this.model = model
    var _this = this
    var template

    // TODO: 2 cases, enter app fresh or reach end of collection
    if(typeof model.get('next') == 'undefined'){
      linksList = new LinksList({subreddit: model.get('subreddit'), after: 't3_' + model.id})
      linksList.fetch({
        remove: false
      , add: true
      , success: function(linksList){
          console.log("LINK FETCH newest:", linksList.newest, "collection length", linksList.models.length)
          _this.model.set({ next: linksList.newest })
          linksList.models[0].set({ prev: model.id })
          linksList.add(_this.model)
          template = _.template( $('#tpl-link').html(), {link: model} )
          _this.$el.html(template)
        },
        error: function(){
          router.notFound()
        }
      })
    } else {
      template = _.template( $('#tpl-link').html(), {link: model} )
      _this.$el.html(template)
    }


  }
, events: {
    'keydown' : 'keyNav'
  , 'click #prev' : 'prevLink'
  , 'click #next' : 'nextLink'
  , 'click #hugegif' : 'nextLink'
  , 'click #home' : 'goHome'
  }
, keyNav: function(e){
    var key = e.which
    if(key == 32) this.nextLink() // space
    else if(key === 39) this.nextLink() // right
    else if(key === 37) this.prevLink() // left
  }
, prevLink: function(){
    if( this.model.get('prev') ){
      router.navigate('/r/' + this.model.get('subreddit') + '/' + this.model.get('prev'), {trigger: true})
    }
  }
, nextLink: function(){
    if( this.model.get('next') ){
      router.navigate('/r/' + this.model.get('subreddit') + '/' + this.model.get('next'), {trigger: true})
    }
  }
, goHome: function(){
    router.navigate('/', {trigger: true})
  }
})

var LinksListView = Backbone.View.extend({
  el: '#container'
, initialize: function(obj) {
    this.subreddit = obj.subreddit
    linksList = new LinksList({subreddit: obj.subreddit})
    linksList.fetch({
      success: function(linksList){
        router.navigate('/r/' + obj.subreddit + '/' + linksList.models[0].id, {trigger: true})
      }
    , error: function(){
        router.notFound()
      }
    })
  }
})

var IndexView = Backbone.View.extend({
  el: '#container'
, initialize: function(){
    this.render()
  }
, render: function(){
    var template = _.template( $('#tpl-index').html(), indexData )
    this.$el.html(template)
  }
, events: {
    'click .feature' : 'featureSub'
  , 'keydown #enter-sub' : 'featureSub'
  }
, featureSub: function(e){
    if(e.type === 'keydown' && e.keyCode === 13) {
      var sub = '/r/' + e.target.value.match(/\w+$/ig)
      router.navigate(sub, {trigger: true})
    } else if(e.type === 'click') {
      router.navigate(e.target.innerText, {trigger: true})
    }
  }
})

var ImgurView = Backbone.View.extend({
  model: Imgur
, el: '#container'
, initialize: function(obj){
    this.render()
  }
, render: function(){
    var _this = this
    var imgurObj = new Imgur({id: this.id})
    imgurObj.fetch({
      success: function(){
        var template = _.template( $('#tpl-imgur-link').html(), { image: imgurObj })
        _this.$el.html(template)
      }
    , error: function(){
        router.notFound()
      }
    })
  }
})

var NotFoundView = Backbone.View.extend({
  el: '#container',
  initialize: function() {
    this.render()
  },
  render: function(){
    var template = _.template( $('#tpl-not-found').html() )
    this.$el.html(template)
  }
})


// ROUTER
var AppRouter = Backbone.Router.extend({
  routes:{
    '':'index'
  , 'r/:sub(/)':'subreddit'
  , 'r/:sub/:id(/)':'link'
  , ':imgur_id':'imgur'
  , '*path':'notFound'
  }
, index: function(){
    this.unbindAll()
    var indexView = new IndexView()
  }
, subreddit: function(sub){
    this.unbindAll()
    var linksListView = new LinksListView({subreddit: sub})
  }
, link: function(sub, id){
    this.unbindAll()
    // TODO: this logic should prolly go into the view initializer or something
    var link = new Link({sub: sub, id: id})

    // Search the collection (if one exists)
    if(linksList){
      var foundLink = linksList.find(function(model) {
        return model.get('id') === link.id
      })
    }

    var linkView = new LinkView()

    // Fetch the model if it wasnt found, otherwise render
    if(typeof foundLink === 'undefined'){
      console.log('fetching individual link model here')
      link.fetch({
        success: function(model, response){
          console.log('SUCCESS! Got model, response:',model, response)
          linkView.render(model)
        },
        error: function(){
          console.log("Link route failed to fetch the link model :( lolfail")
        }
      })
    } else {
      linkView.render(foundLink)
    }

  }
, imgur: function(imgur_id){
    this.unbindAll()
    var imgurView = new ImgurView({id: imgur_id})
  }
, notFound: function(){
    this.unbindAll()
    var notFoundView = new NotFoundView()
  }
, unbindAll: function(){
    $('#container').unbind()
    $("body").unbind('keydown')
  }

})

// GO BABY GO!
var fetchLimit = 100
var linksList = new LinksList({ subreddit: 'gifs' })
  , router = new AppRouter()
  , indexData = {
    favReddits: [
      '/r/gifs'
    , '/r/gif'
    , '/r/reactiongifs'
    , '/r/animalsbeingjerks'
    , '/r/thestopgirl'
    ]
  , background: [
      'http://i.imgur.com/JBbb77q.gif'
    , 'http://i.imgur.com/0Hp3N0q.gif'
    , 'http://i.imgur.com/mfYNrVs.gif'
    , 'http://i.imgur.com/IHSmDlD.gif'
    , 'http://i.imgur.com/iQTQTT1.gif'
    , 'http://i.imgur.com/w8Eyy6T.gif'
    ]
}

Backbone.history.start()
