m = function () {
    emit(this.kind, 1);
}

r = function (k, vals) {
    return Array.sum(vals);
}
res = db.database.mapReduce(m, r, { out : "database_dupes" });