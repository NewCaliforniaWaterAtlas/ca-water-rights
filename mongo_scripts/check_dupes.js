m = function () {
    emit(this.properties.application_pod, 1);
}

r = function (k, vals) {
    return Array.sum(vals);
}
res = db.database.mapReduce(m, r, { out : "duplicates" });