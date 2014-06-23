var assert = require("assert")
var doji = require('../lib/doji.js')

describe('中文也可以', function(){
  it('这是一个测视', function(){
    assert.equal(3, [1,2,3].indexOf(5));
    assert.equal(-1, [1,2,3].indexOf(0));
  })
})
