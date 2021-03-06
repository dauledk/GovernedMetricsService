var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var parseUrlencoded = bodyParser.urlencoded({ extended: false });
var hypercube = require('../lib/setCubeDims');
var worker = require('../lib/dowork');
var getdoc = require('../lib/getdocid');
var gethypercube = require('../lib/getmetricshypercube');
var notifiedByRepo = require('../lib/notifiedByRepo');
var config = require('../config/config');
var logger = require('../lib/logger');


router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

router.route('/')
    .get(function(request, response) {
        logger.info('default route called', { module: 'routes' });
        var cube = hypercube.setCubeDefault();
        worker.doWork(cube, function(error, result) {
            if (error) {
                logger.error('default route failure::' + error, { module: 'routes' });
                response.status(400).json("Bad Request");
            } else {
                //for my reference so I can see how to send responses.
                //response.status(200).json(result.connection.ws.url);
                logger.info('default route success', { module: 'routes' });
                response.status(200).json(result);
            }
        });
    })
    .post(parseUrlencoded, function(request, response) {
        var result = worker.doWork(hypercube.setCubeDims(request.body));
        response.status(200).json(result);
    });

router.route('/testpage')
    .get(function(request, response) {
        var options = {
            root: config.gms.appPath
        };
        response.sendFile('index.htm', options, function(err) {
            if (err) {
                console.log(err);
                response.status(err.status).end();
            }
        });
    });

//for testing getDocId method
router.route('/getdocid')
    .get(function(request, response) {
        logger.info('GET getdocid for ' + config.gms.appName, { module: 'routes' });
        worker.getDoc(config.gms.appName)
            .then(function(result) {
                logger.info('GET getdocid success::' + result, { module: 'routes' });
                response.status(200).json(result);

            })
            .catch(function(error) {
                logger.error('GET getdocid route failure::' + error, { module: 'routes' });
                response.status(400).json(error);
            });
    })
    .post(function(request, response) {
        logger.info('POST getdocid for ' + request.body.appname, { module: 'routes' });
        worker.getDoc(request.body.appname)
            .then(function(result) {
                logger.info('POST getdocid success:: ' + result, { module: 'routes' });
                response.status(200).json(result);

            })
            .catch(function(error) {
                logger.error('POST getdocid failure:: ' + error, { module: 'routes' });
                response.status(400).json(error);
            });
    });

router.route('/add/all')
    .post(function(request, response) {
        logger.info('POST add/all', { module: 'routes' });
        worker.addAll()
            .then(function(result) {
                logger.info('POST add/all success::' + result.result, { module: 'routes' });
                response.status(200).json(result.result);
            })
            .catch(function(error) {
                logger.error('POST add/all failure::' + error, { module: 'routes' });
                response.status(400).json(error);
            });

    });

router.route('/update/all')
    .post(function(request, response) {
        logger.info('POST update/all', { module: 'routes' });
        worker.updateAll()
            .then(function(result) {
                logger.info('POST update/all success::' + result.result, { module: 'routes' });
                logger.info("UPDATE COMPLETE!!!", { module: 'routes' });
                response.status(200).json(result.result + '\n');
            })
            .catch(function(error) {
                logger.error('POST update/all failure::' + error, { module: 'routes' });

                var foo = {
                    result: 'POST update/all failure::' + error
                };

                response.status(200).json(foo.result);
            });

    });

router.route('/delete/fromapp')
    .post(parseUrlencoded, function(request, response) {
        logger.info('POST delete/fromapp for ' + request.body.appname, { module: 'routes' });
        worker.deleteFromApp(request.body)
            .then(function(result) {
                logger.info('POST delete/all success::' + result.result, { module: 'routes' });
                response.status(200).json(result.result + '\n');
            });
    });

router.route('/reload')
    .post(function(request, response) {
        logger.info('POST reload', { module: 'routes' });
        worker.reloadMetricsApp()
            .then(function(result) {
                logger.info('POST reload success::' + result.result, { module: 'routes' });
                response.status(200).json(result.result);
            })
            .catch(function(error) {
                logger.error('POST reload failure::' + error, { module: 'routes' });
                response.status(400).json(error);
            });
    });

router.route('/changeOwner')
    .post(parseUrlencoded, function(request, response) {
        logger.info('POST changeOwner', { module: 'routes' });
        worker.changeOwner(request.body)
            .then(function(result) {
                response.status(200).json(result);
            })
            .catch(function(error) {
                response.status(400).json(error);
            });
    });

router.route("/version")
    .get(function(request, response) {
        response.status(200).send(config.gms.version);
    });

//  Provide Master Data Items from specfic Qlik Sense applications, as an input
//  to the metrics library. Hitting this endpoint should return all master data
// 	items from the relevant Apps (either identified by name or tag in the
//  mangement console).
router.route("/getAllMDI")
    .get(function(request, response) {
        worker.getAllMdi()
            .then(function(result) {
                response.set({ 'Content-Type': 'application/json' })
                logger.info('GET getAllMdi success::' + JSON.stringify(result), { module: 'routes' });
                response.status(200).json(result);
            })
            .catch(function(error) {
                logger.error('GET getAllMdi failure::' + error, { module: 'routes' });
                response.status(400).json(error);
            })
    });

router.route("/notifyme")
    .post(parseUrlencoded, function(request, response) {
        notifiedByRepo.updateRepo(request.body)
            .then(function(result) {
                logger.info("GMS has been notified of a change.", { module: 'routes' })
                response.status(200).json(result);
            })
            .catch(function(error) {
                logger.error("updating repo failed " + JSON.stringify(error), { module: 'routes' });
                response.status(400).json(error);
            });
    });

router.route("/deletenotifyme")
    .post(parseUrlencoded, function(request, response) {
        logger.info("completed delete operation in the repository.  Master Items REMOVED!!!", { module: 'routes' });
        response.status(200).json("Metrics deleted from repository");
    });

router.route("/getapplist")
    .get(function(request, response) {
        logger.info("Getting app list on server", { module: 'routes' });
        worker.getDocList()
            .then(function(result) {
                logger.info("App List retrieved", { module: 'routes' });
                response.status(200).json(result);
            })
            .catch(function(error) {
                logger.error("Failed to get app list: " + JSON.stringify(error), { module: 'routes' });
                response.status(400).json(error);
            });
    });

router.route("/getappobjects/:id")
    .get(function(request, response) {
        logger.info("getting the list of dimensions and measures in app: " + request.params.id, { module: "routes" });
        worker.getObjectList(request.params.id)
            .then(function(result) {
                logger.info("objects retrieved for app: " + request.params.id, { module: "routes" });
                response.status(200).json(result);
            })
            .catch(function(error) {
                logger.error("Failed to get objects from app: " + request.params.id, { module: "routes" });
                response.status(400).json(error);
            })
    })

function isEmpty(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            return false;
        }
    }
    return true;
};

module.exports = router;