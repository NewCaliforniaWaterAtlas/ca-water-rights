m = function () {
  if (!this.properties.watershed) {
      return;
  }
  if((this.kind === "right") && (this.properties.status === 'Active' || this.properties.status === 'Permitted' || this.properties.status === 'Registered' || this.properties.status === 'Licensed')) {
    for (index in this.properties.watershed) {
        emit(this.properties.watershed, 1);
    }
  }
}

r = function(previous, current) {
  var count = 0;

  for (index in current) {
      count += current[index];
  }

  return count;
}


res = db.database.mapReduce(m.toString(), r.toString(), {out: 'watersheds'}, function(e, c) {
  console.log(c);
  process.exit(1);            
});