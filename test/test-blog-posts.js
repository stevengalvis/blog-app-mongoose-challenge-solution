const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
  console.info('seeding blog data');
  const seedData = [];

  for(let i=0; i<=10; i++) {
    seedData.push(generateBlogPostData());
  }
  return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
  return {
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    title: faker.lorem.words(),
    content: faker.lorem.sentences(),
    created: faker.date.past()
  }
}

function teardownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('BlogPosts API resource', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogPostData();
  });

  afterEach(function() {
    return teardownDb();
  });

  after(function() {
    return closeServer();
  });


  describe('GET endpoint', function() {

    it('should return all existing blog posts', function() {
      let res;
      return chai.request(app)
      .get('/posts')
      .then(function(_res) {
        res = _res;
        res.should.have.status(200);
        res.body.should.have.length.of.at.least(1);
      });

    });

    it('should return posts with right fields', function() {
      let resBlogPost;
      return chai.request(app)
      .get('/posts')
      .then(function(res) {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.have.length.of.at.least(1);

        res.body.forEach(function(post) {
          post.should.be.a('object');
          post.should.include.keys(
            'author', 'title', 'content');
        });
        resBlogPost = res.body[0];
        return BlogPost.findById(resBlogPost.id);
      })
      .then(function(post) {
        resBlogPost.id.should.equal(post.id);
        resBlogPost.title.should.equal(post.title);
        resBlogPost.content.should.equal(post.content);
        resBlogPost.author.should.contain(post.author.firstName);
      });
    });

  });

  describe('POST endpoint', function() {

    it('should add a new post', function() {
      const newPost = generateBlogPostData();

      return chai.request(app)
      .post('/posts')
      .send(newPost)
      .then(function(res) {
        res.should.have.status(201);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.include.keys('title', 'content', 'author');
        res.body.title.should.equal(newPost.title);
        res.body.id.should.not.be.null;
        res.body.content.should.equal(newPost.content);
        return BlogPost.findById(res.body.id);
      })
      .then(function(post) {
        post.title.should.equal(newPost.title);
        post.author.firstName.should.equal(newPost.author.firstName);
        post.author.lastName.should.equal(newPost.author.lastName);
        post.content.should.equal(newPost.content);
      });
    });
  });

  describe('PUT endpoint', function() {

    it('should update fields sent over', function() {
      const updateDate = {
        title: 'fofofofof',
        content: 'lalalala'
      };

      return BlogPost
        .findOne()
        .exec()
        .then(function(post) {
          updateDate.id = post.id;

          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateDate);
        })
        .then(function(res) {
          res.should.have.status(201);
          return BlogPost.findById(updateDate.id).exec();
        })
        .then(function(post) {
          post.title.should.equal(updateDate.title);
          post.content.should.equal(updateDate.content);
        });
    });

  });

})
