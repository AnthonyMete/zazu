/*Copyright 2018 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.*/

const express = require('express');
const router = express.Router();

const passport = require('passport');
const BigQuery = require('@google-cloud/bigquery');

const bigquery = new BigQuery();

var User = require('../models/user');
var Organization = require('../models/organization');
var Report = require('../models/report');
var Rule = require('../models/rule');

var utils = require('../utilities/utils');
var config = require('../utilities/config');


router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/getAllUsers', function(req, res) {

    User.find(function(err, docs) {
      if (err) {
        res.send({"status": "500", "message": "User list retrieved error."});
      }
      res.send(docs);
    });
});

router.get('/getAllUsers/:id', function(req, res) {

  User.findOne({ _id : req.params.id }, function(err, docs) {
    if (err) {
      res.send({"status": "500", "message": "User list retrieved error."});
    }
    res.send(docs);
  });
});

router.get('/getUsersByOrganization/:id', function(req, res) {

  var usersByOrg = [];

  User.find(function(err, docs) {
    if (err) {
      res.send({"status": "500", "message": "User list retrieved error."});
    }
    else {
      for (var i = 0; i < docs.length; i++) {
        for (var j = 0; j < docs[i].organizations[j]; j++) {
          if (docs[i].organizations[j].id == req.params.id) {

            usersByOrg.push({ "_id" : docs[i]._id, "firstName" : docs[i].firstName, "lastName" : docs[i].lastName, "organizations": docs[i].organizations, "role": docs[i].role });

          }
        }
      }
      res.send(usersByOrg);
    }
  });
});

router.post('/createNewUser', function(req, res) {
  var newUser = req.body;

  User.create(newUser, function(err, results) {

    var newUserId = results._id;

    if (err) {
      res.send({"status": "500", "message": err.message });
    }
    else {

      var addNewUser = 'INSERT INTO `' + config.bq_instance + '.' + config.bq_dataset + '.users_2` (user_id, googleID, role) VALUES ("' + newUserId + '", "' + newUser.googleID + '", "' + newUser.role + '")';

      bigquery.createQueryStream(addNewUser)
          .on('error', function(err) {
             res.send({"status": "500", "message": err.message });
          })
          .on('data', function(data) {

          })
          .on('end', function() {

            if (newUser.role === "admin") {

              var findAllOrgs = 'SELECT organization_id FROM `' +  config.bq_instance + '.' + config.bq_dataset + '.vendors_2`';

              bigquery.createQueryStream(findAllOrgs)
                  .on('error', function(err) {
                     res.send({"status": "500", "message": err.message });
                  })
                  .on('data', function(data) {

                    var addNewAdminVendor = 'INSERT INTO `' + config.bq_instance + '.' + config.bq_dataset + '.user_vendor_roles_2` (user_id, organization_id) VALUES ("' + newUserId + '", "' + data.organization_id + '")';

                    bigquery.createQueryStream(addNewAdminVendor)
                        .on('error', function(err) {
                           res.send({"status": "500", "message": err.message });
                        })
                        .on('data', function(data) {
                        })
                        .on('end', function() {
                        });
                  })
                  .on('end', function() {

                    var orgList = [];

                    Organization.find(function(err1, docs){
                      if (err1) {
                        res.send({"status": "500", "message": err1.message });
                      }
                      else {
                        for (var i = 0; i < docs.length; i++) {
                          orgList.push({ _id: docs[i]._id, name: docs[i].name });
                        }

                        User.updateOne({ _id: newUserId }, { organizations: orgList }, function(err2, res2){
                          if (err2) {
                            res.send({"status": "500", "message": err2.message });
                          }
                          else {
                            res.send({"status": "200", "userID": newUserId })
                          }
                        });
                      }

                    });
                  });
            }
            else {
              var findOrgIds = 'SELECT organization_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors_2` WHERE organization IN (';

              for (var i = 0; i < (newUser.organizations.length - 1); i++) {
                findOrgIds += '"' + newUser.organizations[i].name + '", ';

                Organization.updateOne({ name: newUser.organizations[i].name }, { $inc: { usersCount: 1 } }, function(err1, res1) {

                  if (err1) {
                    res.send({"status": "500", "message": err1.message });
                  }
                });

              }
              findOrgIds += '"' + newUser.organizations[newUser.organizations.length - 1].name + '")';
              Organization.updateOne({ name: newUser.organizations[newUser.organizations.length - 1].name }, { $inc: { usersCount: 1 } }, function(err1, res1) {

                if (err1) {
                  res.send({"status": "500", "message": err1.message });
                }
              });

              bigquery.createQueryStream(findOrgIds)
                  .on('error', function(err) {
                     res.send({"status": "500", "message": err.message });
                  })
                  .on('data', function(data) {
                    var addNewAdminVendor = 'INSERT INTO `' + config.bq_instance + '.' + config.bq_dataset + '.user_vendor_roles_2` (user_id, organization_id) VALUES ("' + newUserId + '", "' + data.organization_id + '")';

                    bigquery.createQueryStream(addNewAdminVendor)
                        .on('error', function(err) {
                           res.send({"status": "500", "message": err.message });
                        })
                        .on('data', function(data) {

                        })
                        .on('end', function() {
                        });
                  })
                  .on('end', function() {
                    res.send({"status": "200", "userID": newUserId })

                  });

            }
          });
    }
  });
});

router.post('/deleteUser', function(req, res) {
  var deleteUser = req.body;

  User.deleteOne({ _id: deleteUser._id }, function(err, results) {

    if (err) {
      res.send({"status": "500", "message": err.message });
    }
    else {

      var deleteUserQuery = 'DELETE FROM `' + config.bq_instance + '.' + config.bq_dataset + '.users_2` WHERE user_id = "' + deleteUser._id + '"';

      bigquery.createQueryStream(deleteUserQuery)
          .on('error', function(err) {
             res.send({"status": "500", "message": err.message });
          })
          .on('data', function(data) {

          })
          .on('end', function() {

              var deleteUserVendor = 'DELETE FROM `' + config.bq_instance + '.' + config.bq_dataset + '.user_vendor_roles_2` WHERE user_id = "' + deleteUser._id + '"';

              bigquery.createQueryStream(deleteUserVendor)
                .on('error', function(err) {
                  res.send({"status": "500", "message": err.message });
                })
                .on('data', function(data) {
                })
                .on('end', function() {

                  var deleteCurrentVendorView = 'DELETE FROM `' + config.bq_instance + '.' + config.bq_dataset + '.user_current_vendor_2` WHERE user_id = "' + deleteUser._id + '"';

                  bigquery.createQueryStream(deleteCurrentVendorView)
                    .on('error', function(err) {
                      res.send({"status": "500", "message": err.message });
                    })
                    .on('data', function(data) {
                    })
                    .on('end', function() {

                      if (deleteUser.role === "viewer") {
                        for (var i = 0; i < deleteUser.organizations.length; i++) {

                          Organization.updateOne({ _id : deleteUser.organizations[i]._id }, { $inc: { usersCount: -1 } }, function(err1, res1) {

                            if (err1) {
                              res.send({"status": "500", "message": err1.message });
                            }
                          });
                        }
                        res.send({"status": "200", "userID": deleteUser._id });
                      }
                      else {
                        res.send({"status": "200", "userID": deleteUser._id });
                      }
                    });
                });
          });
    }
  });
});

router.get('/getAllOrganizations', function(req, res) {

    Organization.find(function(err, docs) {
      if (err) {
        res.send({"status": "500", "message": "Organization list retrieved error."});
      }
      res.send(docs);
    });
});

router.get('/getAllOrganizationsWithNoDetails', function(req, res) {

    var orgsNoDetails = [];

    Organization.find(function(err, docs) {
      if (err) {
        res.send({"status": "500", "message": "Organization list retrieved error."});
      }

      for (var i = 0; i < docs.length; i++) {
          orgsNoDetails.push({ _id: docs[i]._id, name: docs[i].name });
      }
      res.send(orgsNoDetails);
    });
});

router.get('/getOrganizationById/:orgid', function(req, res) {

    Organization.findOne({ _id: req.params.orgid }, function(err, docs) {
      if (err) {
        res.send({"status": "500", "message": "Organization list retrieved error."});
      }
      res.send(docs);
    });
});

router.post('/createOrganization', function(req, res) {

    var newOrg = req.body;
    newOrg.reportsCount = 0;
    newOrg.usersCount = 0;
    newOrg.datarulesCount = 0;

    Organization.create(newOrg, function(err, results) {
      var newOrgId = results._id;

      if (err) {
        res.send({"status": "500", "message": err.message });
      }
      else {
        var insertRow = 'INSERT INTO `' + config.bq_instance + '.' + config.bq_dataset + '.vendors_2` (organization_id, organization) VALUES ("' + newOrgId + '","' + newOrg.name + '")';

        bigquery.createQueryStream(insertRow)
            .on('error', function(err) {
               res.send({"status": "500", "message": err.message });
            })
            .on('data', function(data) {

            })
            .on('end', function() {

              var retailerIdList = [];
              var getRetailerIds = 'SELECT user_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.users_2` WHERE role = "admin"';

              bigquery.createQueryStream(getRetailerIds)
                .on('error', function(err) {
                   res.send({"status": "500", "message": err.message });
                })
                .on('data', function(data) {

                   var user_id = data.user_id;
                   var addRetailerAccesses = 'INSERT INTO `' + config.bq_instance + '.' + config.bq_dataset + '.user_vendor_roles_2` (user_id, organization_id) VALUES ("' + user_id + '", "' + newOrgId + '")';

                   bigquery.createQueryStream(addRetailerAccesses)
                     .on('error', function(err) {
                        res.send({"status": "500", "message": err.message });
                     })
                     .on('data', function(data) {

                     })
                     .on('end', function() {

                       User.updateOne({ _id: user_id }, { $push: { organizations: { _id: newOrgId, name: newOrg.name } } }, function(err, res1) {
                         if (err) {
                           console.log(err);
                           res.send({"status": "500", "message": err.message });
                         }
                       });
                     });
                })
                .on('end', function() {
                  res.send({"status": "200", "orgID": newOrgId })
                })

            });
      }
    });
});

router.post('/deleteOrganization', function(req, res) {

    var orgDelete = req.body;

    Organization.deleteOne({ _id: orgDelete._id }, function(err, results) {
      if (err) {
        res.send({"status": "500", "message": err.message });
      }
      else {
        var delOrg = 'DELETE FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors_2` WHERE organization_id = "' + orgDelete._id + '"';

        bigquery.createQueryStream(delOrg)
          .on('error', function(err) {
             res.send({"status": "500", "message": err.message });
          })
          .on('data', function(data) {

          })
          .on('end', function() {

            var delCurrentVendorView = 'DELETE FROM `' + config.bq_instance + '.' + config.bq_dataset + '.user_current_vendor_2` WHERE organization_id = "' + orgDelete._id + '"';

            bigquery.createQueryStream(delCurrentVendorView)
              .on('error', function(err) {
                 res.send({"status": "500", "message": err.message });
              })
              .on('data', function(data) {

              })
              .on('end', function() {

                var delUserVendor = 'DELETE FROM `' + config.bq_instance + '.' + config.bq_dataset + '.user_vendor_roles_2` WHERE organization_id = "' + orgDelete._id + '"';

                bigquery.createQueryStream(delUserVendor)
                  .on('error', function(err) {
                     res.send({"status": "500", "message": err.message });
                  })
                  .on('data', function(data) {

                  })
                  .on('end', function() {
                    User.updateMany( { organizations: { $elemMatch: { _id: orgDelete._id, name: orgDelete.name } } }, { $pull: { organizations: { _id: orgDelete._id, name: orgDelete.name  } } }, function(err, res1) {
                      if (err) {
                        console.log(err);
                        res.send({"status": "500", "message": err.message });
                      }
                      else {
                        res.send({"status": "200", "results": results })
                      }
                    });
                  });
              });
          });

      }
    });
});


router.get('/getAllReports', function(req, res) {

    Report.find(function(err, docs) {
      if (err) {
        res.send({"status": "500", "message": "Report list retrieved error."});
      }
      else {
        res.send(docs);
      }
    });
});

router.get('/getAllReports/:id', function(req, res) {

  Report.findOne({ _id : req.params.id }, function(err, docs) {
    if (err) {
      res.send({"status": "500", "message": "Report list retrieved error."});
    }
    res.send(docs);
  });
});

router.get('/getReportByOrganization/:id', function(req, res) {

  var reportsByOrg = [];

  Report.find(function(err, docs) {
    if (err) {
      res.send({"status": "500", "message": "Report list retrieved error."});
    }
    else {
      for (var i = 0; i < docs.length; i++) {
        for (var j = 0; j < docs[i].organizations[j]; j++) {
          if (docs[i].organizations[j]._id == req.params.id) {

            reportsByOrg.push(docs[i]);

          }
        }
      }
      res.send(reportsByOrg);
    }
  });
});

router.get('/getReportByUser/:id', function(req, res) {

  var reportsByUser = [];

  User.find({ _id: req.params.id }, function(err, docs) {
    if (err) {
      res.send({"status": "500", "message": "User retrieved error."});
    }
    else {
      var userOrgList = docs[0].organizations;

      Report.find(function(err, reports) {
        if (err) {
          res.send({"status": "500", "message": "Report list retrieved error."});
        }
        else {

          for (var i = 0; i < reports.length; i++) {
            for (var k = 0; k < reports[i].organizations.length; k++) {
              for (var j = 0; j < userOrgList[j]; j++) {
                if (userOrgList[j]._id == reports[i].organizations[k]._id) {

                  reportsByUser.push(reports[i]);

                }
              }
            }
          }
          res.send(reportsByUser);
        }
      });
    }
  });
});

router.post('/createReport', function(req, res) {

  var newReport = req.body;
  newReport.createdBy = req.session.passport.user.id;
  newReport.updatedBy = "";

  Report.create(newReport, function(err, results) {

    if (err) {
      res.send({"status": "500", "message": "Report creation error."});
    }
    else {
      /* TO DO - Share report and datasource in drive with all users in org */
      res.send({"status": "200", "results": results._id });
    }

  });
});


router.post('/deleteReport', function(req, res) {

  var deleteReport = req.body;

  Report.removeOne(deleteReport, function(err, results) {

    if (err) {
      res.send({"status": "500", "message": "Report deletion error."});
    }
    else {
      /* TO DO - Unshare report and datasource in drive with all users in all orgs of the report */
      res.send({"status": "200", "results": results });
    }

  });
});

router.get('/getDataRules/:orgid', function(req, res) {

  var rulesByOrg = [];

  Rule.find(function(err, docs) {
    if (err) {
      res.send({"status": "500", "message": "Rule list retrieved error."});
    }
    else {
      for (var i = 0; i < docs.length; i++) {
          if (docs[i].organization._id == req.params.id) {

            rulesByOrg.push(docs[i]);

          }
      }
      res.send(rulesByOrg);
    }
  });
});

router.post('/addRule', (req, res) => {

  var newRule = req.body;

  var updateRow = utils.buildPermissionsQuery(config.bq_instance, config.bq_client_dataset, config.bq_client_data_perms, [ newRule.organization._id ], newRule.identifier, newRule.identifierType, newRule.condition, newRule.token);

  bigquery.createQueryStream(updateRow)
    .on('error', function(err) {
      res.send({"status": "500", "message": err.message });
    })
    .on('data', function(data) {

    })
    .on('end', function() {

        Rule.create(newRule, function(err, results) {
          if (err) {
            res.send({"status": "500", "message": err.message });
          }
          res.send({"status": "200", "message": "Rule creation succeeded.", "results": results });

        })
    });
});

router.post('/deleteRule', (req, res) => {

  var delRule = req.body;
  var updateRow = utils.buildPermissionsQuery(config.bq_instance, config.bq_client_dataset, config.bq_client_data_perms, [""], delRule.identifier, delRule.identifierType, delRule.condition, delRule.token);

  bigquery.createQueryStream(updateRow)
    .on('error', function(err) {
        res.send({"status": "500", "message": err.message });
    })
    .on('data', function(data) {

    })
    .on('end', function() {
        Rule.removeOne({ _id : delRule._id }, function(err, results) {
          if (err) {
            console.log(err);
            res.send({"status": "500", "message": err.message });
          }
          res.send({"status": "200", "message": "Rule deletion succeeded.", "results": results });

        });
    })

});

// route middleware to make sure a user is logged in
router.get('/isLoggedIn', (req, res) => {
    // if user is authenticated in the session, carry on
    if ((req.session.passport)&&(req.session.passport.user.id)&&(req.session.passport.user != "")) {
      res.send({"status": "200", "message": "User logged in.", "isLoggedIn": true });
    }
    else {
      res.send({"status": "403", "message": "User not logged in.", "isLoggedIn": false });
    }

    // if they aren't redirect them to the home page
});

router.get('/listDatasources', function(req, res) {

    var dsList = [];
    var dataset = bigquery.dataset(config.bq_views_dataset);

    dataset.getTables(function(err, tables) {
        if (err) {
          res.send({"status": "500", "message": err.message });
        }

        for (var i = 0; i < tables.length; i++) {
            dsList.push(tables[i].id);
        }
        res.send({"status": "200", "message": "Table listing succeeded.", "tables": dsList });
    });

});


//
// router.post('/editUser', (req, res) => {
//
//   var selectedUser = req.body.selectedUser;
//   var editedUser = req.body.editedUser;
//
//   if (selectedUser.role === editedUser.role) {
//
//     if (selectedUser.organization !== editedUser.organization) {
//
//       var updateOrgName = 'UPDATE `' + config.bq_instance + '.' + config.bq_dataset + '.vendors` SET organization = "' + editedUser.organization + '" WHERE organization = "' + selectedUser.organization + '"';
//
//       bigquery.createQueryStream(updateOrgName)
//          .on('error', function(err) {
//             res.send({"status": "500", "message": err.message });
//          })
//          .on('data', function(row) {
//
//           })
//          .on('end', function() {
//            var updateRow = 'UPDATE `' + config.bq_instance + '.' + config.bq_dataset + '.users` SET google_email = "' + editedUser.google_email + '", email = "' + editedUser.email + '", organization = "' + editedUser.organization + '", role = "' + editedUser.role + '" WHERE email = "' + selectedUser.email + '"';
//
//            bigquery.createQueryStream(updateRow)
//              .on('error', function(err) {
//                  res.send({"status": "500", "message": err.message });
//              })
//              .on('data', function(row) {
//
//              })
//              .on('end', function() {
//                User.findOneAndUpdate({ name: selectedUser.name }, { name: editedUser.name, email: editedUser.email, google_email: editedUser.google_email, organization: editedUser.organization, role: editedUser.role }, function(err, results) {
//                  if (err) {
//                    console.log(err);
//                    res.send({"status": "500", "message": err.message });
//                  }
//
//                  User.find(function(err, docs) {
//                    if (err) {
//                      res.send({"status": "500", "message": err.message });
//                    }
//                    res.send({"status": "200", "message": "User deletion succeeded.", "users": docs });
//                  });
//                });
//              });
//          });
//     }
//   }
//   else {
//          var findUserId = 'SELECT user_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.users` WHERE email = "' + selectedUser.email + '"';
//
//           bigquery.createQueryStream(findUserId)
//              .on('error', function(err) {
//                 res.send({"status": "500", "message": err.message });
//              })
//              .on('data', function(data) {
//                var userId = data.user_id;
//
//                if ((selectedUser.role == "vendor")&&(editedUser.role == "retailer")) {
//
//                  var findOrgIdToRm = 'SELECT organization_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors` WHERE organization = "' + selectedUser.organization + '"';
//
//                  bigquery.createQueryStream(findOrgIdToRm)
//                     .on('error', function(err) {
//                        res.send({"status": "500", "message": err.message });
//                     })
//                     .on('data', function(orgIdRow) {
//
//                        var delRolesForOrg = 'DELETE FROM `' + config.bq_instance + '.' + config.bq_dataset + '.user_vendor_roles` WHERE organization_id = ' + orgIdRow.organization_id;
//
//                        bigquery.createQueryStream(delRolesForOrg)
//                           .on('error', function(err) {
//                              res.send({"status": "500", "message": err.message });
//                           })
//                           .on('data', function(data) {
//                           })
//                           .on('end', function() {
//                             var delOrg = 'DELETE FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors` WHERE organization = "' + selectedUser.organization + '"';
//
//                             bigquery.createQueryStream(delOrg)
//                                .on('error', function(err) {
//                                   res.send({"status": "500", "message": err.message });
//                                })
//                                .on('data', function(row) {
//
//                                 })
//                                .on('end', function() {
//                                  var findOrgIds = 'SELECT organization_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors`';
//
//                                  bigquery.createQueryStream(findOrgIds)
//                                     .on('error', function(err) {
//                                        res.send({"status": "500", "message": err.message });
//                                     })
//                                     .on('data', function(row) {
//                                          var addPermissions = 'INSERT INTO `' + config.bq_instance + '.' + config.bq_dataset + '.user_vendor_roles` (user_id, organization_id) VALUES (' + userId + ', ' + row.organization_id + ')';
//
//                                          bigquery.createQueryStream(addPermissions)
//                                             .on('error', function(err) {
//                                                res.send({"status": "500", "message": err.message });
//                                             })
//                                             .on('data', function(row) {
//
//                                              })
//                                             .on('end', function() {
//
//                                             });
//                                      })
//                                     .on('end', function() {
//
//                                     });
//                                });
//                           });
//
//                      })
//                     .on('end', function() {
//                     });
//
//                 }
//                 else if ((selectedUser.role == "retailer")&&(editedUser.role == "vendor")) {
//                   var orgNum = -1;
//
//                   var findOrg = 'SELECT organization_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors` WHERE organization = "' + selectedUser.organization + '"';
//
//                   bigquery.createQueryStream(findOrg)
//                      .on('error', function(err) {
//                         res.send({"status": "500", "message": err.message });
//                      })
//                      .on('data', function(row) {
//                        orgNum = row.organization_id;
//
//                       })
//                      .on('end', function() {
//
//                           if (orgNum == -1) {
//
//                             User.find({role: "retailer"}, function(err, docs) {
//                                if (err) {
//                                  console.log(err);
//                                  res.send({"status": "500", "message": err.message });
//                                }
//
//                                for (var i = 0; i < docs.length; i++) {
//                                  if (docs[i].accesses.indexOf(selectedUser.organization) == -1 ) {
//                                    User.update({email: docs[i].email }, { $push: { accesses: selectedUser.organization } }, function(err, results) {
//                                      if (err) {
//                                        console.log(err);
//                                        res.send({"status": "500", "message": err.message });
//                                      }
//                                    });
//                                  }
//                                }
//                             });
//
//                             var newOrgId = 'SELECT count(*) AS total_orgs FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors`';
//
//                             bigquery.createQueryStream(newOrgId)
//                               .on('error', function(err) {
//                                   res.send({"status": "500", "message": err.message });
//                               })
//                               .on('data', function(data) {
//
//                                  orgNum = data.total_orgs + 1;
//                                  var insertOrgRow = 'INSERT INTO `' + config.bq_instance + '.' + config.bq_dataset + '.vendors` (organization_id,organization) VALUES (' + orgNum + ',"' + selectedUser.organization + '")';
//
//                                  bigquery.createQueryStream(insertOrgRow)
//                                     .on('error', function(err) {
//                                         res.send({"status": "500", "message": err.message });
//                                     })
//                                     .on('data', function(data) {
//
//                                     })
//                                     .on('end', function() {
//
//                                         var addVendorAccesses = 'INSERT INTO `' + config.bq_instance + '.' + config.bq_dataset + '.user_vendor_roles` (user_id, organization_id) VALUES (' + userId + ', ' + orgNum + ')';
//
//                                         bigquery.createQueryStream(addVendorAccesses)
//                                           .on('error', function(err) {
//                                             res.send({"status": "500", "message": err.message });
//                                           })
//                                           .on('data', function(data) {
//
//                                           })
//                                           .on('end', function() {
//
//                                             var retailerIdList = [];
//                                             var getRetailerIds = 'SELECT user_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.users` WHERE role = "retailer"';
//
//                                             bigquery.createQueryStream(getRetailerIds)
//                                               .on('error', function(err) {
//                                                  res.send({"status": "500", "message": err.message });
//                                               })
//                                               .on('data', function(data) {
//
//                                                  var addRetailerAccesses = 'INSERT INTO `' + config.bq_instance + '.' + config.bq_dataset + '.user_vendor_roles` (user_id, organization_id) VALUES (' + data.user_id + ', ' + orgNum + ')';
//
//                                                  bigquery.createQueryStream(addRetailerAccesses)
//                                                    .on('error', function(err) {
//                                                       res.send({"status": "500", "message": err.message });
//                                                    })
//                                                    .on('data', function(data) {
//
//                                                    })
//                                                    .on('end', function() {
//                                                    })
//                                               })
//                                               .on('end', function() {
//
//                                               })
//
//                                           });
//                                     })
//                               })
//                               .on('end', function(){
//
//                               });
//
//                           }
//               })
//              .on('end', function() {
//
//              });
//          }
//        })
//        .on('end', function() {
//          var updateRow = 'UPDATE `' + config.bq_instance + '.' + config.bq_dataset + '.users` SET google_email = "' + editedUser.google_email + '", email = "' + editedUser.email + '", organization = "' + editedUser.organization + '", role = "' + editedUser.role + '" WHERE email = "' + selectedUser.email + '"';
//
//          bigquery.createQueryStream(updateRow)
//            .on('error', function(err) {
//                res.send({"status": "500", "message": err.message });
//            })
//            .on('data', function(row) {
//
//            })
//            .on('end', function() {
//              User.findOneAndUpdate({ name: selectedUser.name }, { name: editedUser.name, email: editedUser.email, google_email: editedUser.google_email, organization: editedUser.organization, role: editedUser.role }, function(err, results) {
//                if (err) {
//                  console.log(err);
//                  res.send({"status": "500", "message": err.message });
//                }
//
//                User.find(function(err, docs) {
//                  if (err) {
//                    res.send({"status": "500", "message": err.message });
//                  }
//                  res.send({"status": "200", "message": "User deletion succeeded.", "users": docs });
//                });
//              });
//            });
//        });
//   }
//
//
// });
//
//
// // router.get('/refreshPermissionsTable', function(req, res) {
// //     var dataset = bigquery.dataset(config.bq_client_dataset);
// //     const dest_table = dataset.table(config.bq_client_data_perms);
// //     const orig_table = dataset.table(config.bq_client_data_base);
// //
// //     dest_table.delete(function(err, apiResponse) {
// //
// //       if ((err)&&(err.code != 404)) {
// //         res.send({"status": "500", "message": err.message });
// //       }
// //       else {
// //           orig_table.copy(dest_table, function(err1, apiResponse1) {
// //
// //              if (err1) {
// //                res.send({"status": "500", "message": err1.message });
// //              }
// //              else {
// //                dest_table.getMetadata().then(function(data) {
// //                    var metadata = data[0];
// //                    var new_schema = metadata.schema.fields;
// //
// //                    new_schema.push({ name: "Permissions", type: "STRING", mode: "REPEATED" });
// //                    metadata.schema.fields = new_schema;
// //
// //                    dest_table.setMetadata(metadata, function(err2, metadata, apiResponse2) {
// //
// //                      if (err2) {
// //                        res.send({"status": "500", "message": err2.message });
// //                      }
// //                      else {
// //
// //                        Rule.find(function(err, docs) {
// //                            if (err) {
// //                              res.send({"status": "500", "message": "Rule list retrieved error."});
// //                            }
// //
// //                            for (var i = 0; i < docs.length; i++) {
// //
// //                               var curr_rule = docs[i];
// //                               var permsList = [];
// //
// //                               for (var j = 0; j < curr_rule.organization.length; j++) {
// //
// //                                 var findId = 'SELECT organization_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors` WHERE organization = "' + curr_rule.organization[j] + '"';
// //
// //                                 bigquery.createQueryStream(findId)
// //                                    .on('error', function(err) {
// //                                       res.send({"status": "500", "message": err.message });
// //                                    })
// //                                    .on('data', function(row) {
// //                                       permsList.push(row.organization_id);
// //
// //                                       if (permsList.length === curr_rule.organization.length) {
// //
// //                                         var updateRow = utils.buildPermissionsQuery(config.bq_instance, config.bq_client_dataset, config.bq_client_data_perms, permsList, curr_rule.identifier, curr_rule.identifierType, curr_rule.condition, curr_rule.token);
// //
// //                                         bigquery.createQueryStream(updateRow)
// //                                             .on('error', function(err) {
// //                                                res.send({"status": "500", "message": err.message });
// //                                             })
// //                                             .on('data', function(data) {
// //
// //                                             })
// //                                             .on('end', function() {
// //                                                 if (i === docs.length) {
// //                                                   res.send({"status": "200", "message": "Permissions table created.", "schema": metadata.schema.fields });
// //                                                 }
// //
// //                                             })
// //                                       }
// //                                     })
// //                                    .on('end', function() {
// //
// //                                    });
// //
// //                               }
// //                            }
// //                        });
// //
// //                      }
// //                    });
// //                });
// //              }
// //           });
// //       }
// //     });
// // });
//
//


//
// router.post('/editRule', (req, res) => {
//
//   var selectedRule = req.body.selectedRule;
//   var editedRule = req.body.editedRule;
//
//   var updateRow = utils.buildPermissionsQuery(config.bq_instance, config.bq_client_dataset, config.bq_client_data_perms, [""], selectedRule.identifier, selectedRule.identifierType, selectedRule.condition, selectedRule.token);
//
//   bigquery.createQueryStream(updateRow)
//      .on('error', function(err) {
//         res.send({"status": "500", "message": err.message });
//      })
//      .on('data', function(data) {
//
//      })
//      .on('end', function() {
//
//        var permsList = [];
//
//        for (var i = 0; i < editedRule.organization.length; i++) {
//
//            var findId = 'SELECT organization_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors` WHERE organization = "' + editedRule.organization[i] + '"';
//
//            bigquery.createQueryStream(findId)
//              .on('error', function(err) {
//                  res.send({"status": "500", "message": err.message });
//              })
//              .on('data', function(row) {
//
//                  permsList.push(row.organization_id);
//
//                  if (permsList.length === editedRule.organization.length) {
//
//                    var secondUpdateRow = utils.buildPermissionsQuery(config.bq_instance, config.bq_client_dataset, config.bq_client_data_perms, permsList, editedRule.identifier, editedRule.identifierType, editedRule.condition, editedRule.token);
//
//                    bigquery.createQueryStream(secondUpdateRow)
//                      .on('error', function(err) {
//                          res.send({"status": "500", "message": err.message });
//                      })
//                      .on('data', function(data) {
//
//                      })
//                      .on('end', function() {
//                        Rule.findOneAndUpdate({ name: selectedRule.name }, { name: editedRule.name, identifier: editedRule.identifier, condition: editedRule.condition, token: editedRule.token, organization: editedRule.organization }, function(err, results) {
//                          if (err) {
//                            res.send({"status": "500", "message": err.message });
//                          }
//
//                          Rule.find(function(err, docs) {
//                            if (err) {
//                              res.send({"status": "500", "message": err.message });
//                            }
//                            res.send({"status": "200", "message": "User deletion succeeded.", "rules": docs });
//                          });
//                        });
//                      })
//                  }
//
//              })
//              .on('end', function() {
//
//              })
//          }
//      })
//
// });
//
// // Report management APIs
//
// // route for showing the rules page
// router.get('/reports', function(req, res) {
//
//       res.render('reports', {
//           user : req.user // get the user out of session and pass to template
//       });
//
// });
//
// router.get('/listDatasources', function(req, res) {
//
//     var dsList = [];
//     var dataset = bigquery.dataset(config.bq_views_dataset);
//
//     dataset.getTables(function(err, tables) {
//         if (err) {
//           res.send({"status": "500", "message": err.message });
//         }
//
//         for (var i = 0; i < tables.length; i++) {
//             dsList.push(tables[i].id);
//         }
//         res.send({"status": "200", "message": "Table listing succeeded.", "tables": dsList });
//     });
//
// });
//
// router.post('/listIdentifiers', function(req, res) {
//
//     var table_id = req.body.datasource;
//     var dataset = bigquery.dataset(config.bq_views_dataset);
//     var table = dataset.table(table_id);
//
//     table.getMetadata().then(function(data) {
//         var identifiers = data[0].schema.fields;
//
//         res.send({"status": "200", "message": "Table listing succeeded.", "identifiers": identifiers });
//     });
//
// });
//
// router.get('/listOrgs', function(req, res) {
//
//   var orgList = [];
//   var currUser;
//
//   User.findOne({ _id: req.session.passport.user.id }, function(err, doc) {
//      if (err) {
//         res.send({"status": "500", "message": "Report list retrieved error."});
//      }
//
//      var findUserId = 'SELECT user_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.users` WHERE email = "' + doc.email + '"';
//
//      bigquery.createQueryStream(findUserId)
//         .on('error', function(err) {
//            res.send({"status": "500", "message": err.message });
//         })
//         .on('data', function(data) {
//           currUser = data.user_id;
//
//           var findVisibilities = 'SELECT b.organization FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors` as b INNER JOIN `' + config.bq_instance + '.' + config.bq_dataset + '.user_vendor_roles` as a on b.organization_id = a.organization_id where a.user_id = ' + currUser;
//
//           bigquery.createQueryStream(findVisibilities)
//              .on('error', function(err) {
//                 res.send({"status": "500", "message": err.message });
//              })
//              .on('data', function(visib) {
//                 orgList.push(visib.organization);
//              })
//              .on('end', function() {
//
//                var findCurrView = 'SELECT b.organization FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors` as b INNER JOIN `' + config.bq_instance + '.' + config.bq_dataset + '.user_current_vendor` as a on b.organization_id = a.organization_id WHERE a.user_id = ' + currUser;
//
//                bigquery.createQueryStream(findCurrView)
//                   .on('error', function(err) {
//                      res.send({"status": "500", "message": err.message });
//                   })
//                   .on('data', function(result) {
//
//                      if (orgList.indexOf(result.organization) > -1) {
//                        orgList.splice(orgList.indexOf(result.organization), 1);
//                        orgList.unshift(result.organization);
//                      }
//                   })
//                   .on('end', function() {
//                     res.send({"status": "200", "message": "Organization list retrieved.", "orgs": orgList });
//                   });
//              });
//
//         })
//         .on('end', function() {
//         });
//   });
//
// });
//
// router.post('/listReports', function(req, res) {
//
//   if (req.session.passport.user.role == "retailer") {
//
//     var vendor = req.body.vendor;
//
//     if (vendor == "") {
//       Report.find(function(err, docs) {
//         if (err) {
//           res.send({"status": "500", "message": "Report list retrieved error."});
//         }
//         res.send({"status": "200", "message": "Report list retrieved.", "reports": docs });
//       });
//     }
//     else {
//       var viewExists = -1;
//       var currUser;
//       var orgView;
//       var finalReportList = [];
//
//       var findOrgId = 'SELECT organization_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.vendors` WHERE organization = "' + vendor + '"';
//
//       bigquery.createQueryStream(findOrgId)
//           .on('error', function(err) {
//              res.send({"status": "500", "message": err.message });
//           })
//           .on('data', function(orgIdRow) {
//              orgView = orgIdRow.organization_id;
//
//              User.findOne({ _id: req.session.passport.user.id }, function(err, doc) {
//                if (err) {
//                  res.send({"status": "500", "message": "Report list retrieved error."});
//                }
//                var findUserId = 'SELECT user_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.users` WHERE email = "' + doc.email + '"';
//
//                bigquery.createQueryStream(findUserId)
//                    .on('error', function(err) {
//                       res.send({"status": "500", "message": err.message });
//                    })
//                    .on('data', function(data) {
//
//                       currUser = data.user_id;
//                       var findViewRow = 'SELECT organization_id FROM `' + config.bq_instance + '.' + config.bq_dataset + '.user_current_vendor` WHERE user_id = ' + currUser;
//
//                       bigquery.createQueryStream(findViewRow)
//                           .on('error', function(err) {
//                              res.send({"status": "500", "message": err.message });
//                           })
//                           .on('data', function(row) {
//
//                               viewExists = row.organization_id;
//
//                           })
//                           .on('end', function() {
//
//                             if (viewExists == -1) {
//                                 var insertOrUpdateView = 'INSERT INTO `' + config.bq_instance + '.' + config.bq_dataset + '.user_current_vendor` (user_id, organization_id) VALUES (' + currUser + ', ' + orgView + ')';
//                             }
//                             else {
//                                 var insertOrUpdateView = 'UPDATE `' + config.bq_instance + '.' + config.bq_dataset + '.user_current_vendor` SET organization_id = ' + orgView + ' WHERE user_id = ' + currUser;
//                             }
//
//                             bigquery.createQueryStream(insertOrUpdateView)
//                                 .on('error', function(err) {
//                                    res.send({"status": "500", "message": err.message });
//                                 })
//                                 .on('data', function(data) {
//
//
//                                 })
//                                 .on('end', function() {
//
//                                   Report.find(function(err, docs) {
//                                     if (err) {
//                                       res.send({"status": "500", "message": "Report list retrieved error."});
//                                     }
//
//                                     for (var i = 0; i < docs.length; i++) {
//                                       if (docs[i].organization.indexOf(vendor) > -1) {
//                                           finalReportList.push(docs[i]);
//                                       }
//                                     }
//                                     res.send({"status": "200", "message": "Report list retrieved.", "reports": finalReportList });
//                                   });
//                                 });
//                           });
//
//                    })
//                    .on('end', function() {
//                    });
//
//              });
//
//           })
//           .on('end', function() {
//           });
//     }
//
//   }
//   else {
//       User.find({ _id: req.session.passport.user.id }, function(err, user) {
//
//         if (err) {
//             res.send({"status": "404", "message": "User not found."});
//         }
//         else {
//             if (user.length === 0) {
//               res.send({"status": "404", "message": "User not found."});
//             }
//             else {
//               Report.find(function(err, docs) {
//                 if (err) {
//                   res.send({"status": "500", "message": "Report list retrieved error."});
//                 }
//
//                 for (var i = 0; i < docs.length; i++) {
//                   if (docs[i].organization.indexOf(user[0].organization) > -1) {
//                       finalReportList.push(docs[i]);
//                   }
//                 }
//
//                 res.send({"status": "200", "message": "Report list retrieved.", "reports": finalReportList });
//               });
//             }
//         }
//       });
//   }
//
// });
//
// router.post('/addReport', (req, res) => {
//
//   var newReport = req.body;
//
//   Report.create(newReport, function(err, results) {
//     if (err) {
//       console.log(err);
//       res.send({"status": "500", "message": err.message });
//     }
//
//     Report.find(function(err, results) {
//       if (err) {
//         res.send({"status": "500", "message": err.message });
//       }
//       res.send({"status": "200", "message": "Report creation succeeded.", "reports": results });
//     });
//
//   });
// });
//
//
// router.post('/deleteReport', (req, res) => {
//
//   var delReport = req.body;
//   // save the user
//   Report.remove({ name: delReport.name }, function(err, results) {
//     if (err) {
//       console.log(err);
//       res.send({"status": "500", "message": err.message });
//     }
//
//     Report.find(function(err, docs) {
//       if (err) {
//         res.send({"status": "500", "message": err.message });
//       }
//       res.send({"status": "200", "message": "Report deletion succeeded.", "reports": docs });
//     });
//   });
//
// });
//
// router.post('/editReport', (req, res) => {
//
//   var selectedReport = req.body.selectedReport;
//   var editedReport = req.body.editedReport;
//
//   Report.findOneAndUpdate({ name: selectedReport.name }, { name: editedReport.name, link: editedReport.link, organization: editedReport.organization }, function(err, results) {
//     if (err) {
//       console.log(err);
//       res.send({"status": "500", "message": err.message });
//     }
//
//     Report.find(function(err, docs) {
//       if (err) {
//         res.send({"status": "500", "message": err.message });
//       }
//       res.send({"status": "200", "message": "Report edit succeeded.", "reports": docs });
//     });
//   });
//
// });
//
// router.post('/getReport', (req, res) => {
//
//   var reportId = req.body.report_id;
//
//   Report.findOne({ _id : reportId }, function(err, doc) {
//     if (err) {
//       console.log(err);
//       res.send({"status": "500", "message": err.message });
//     }
//     res.send({"status": "200", "message": "Report fetch succeeded.", "report": doc });
//   });
//
// });
//
// router.post('/isReportUserAuthed', (req, res) => {
//
//   var reportId = req.body.report_id;
//   var user = req.session.passport.user;
//
//   Report.findOne({ _id : reportId }, function(err, doc) {
//     if (err) {
//       console.log(err);
//       res.send({"status": "500", "message": err.message });
//     }
//
//     User.findOne({ _id : user.id }, function(e, data) {
//       if (e) {
//         console.log(e);
//         res.send({"status": "500", "message": e.message });
//       }
//
//       if ((data.organization === doc.organization[0])||(data.role === "retailer")) {
//         res.send({"status": "200", "message": "User has access to this report.", "isAuthed": true });
//       }
//       else {
//         res.send({"status": "200", "message": "User does not have access to this report.", "isAuthed": false });
//       }
//     })
//   });
//
// });
//
// // route middleware to make sure a user is logged in
// router.get('/isLoggedIn', (req, res) => {
//     // if user is authenticated in the session, carry on
//     if ((req.session.passport)&&(req.session.passport.user.id)&&(req.session.passport.user != "")) {
//       res.send({"status": "200", "message": "User logged in.", "isLoggedIn": true });
//     }
//     else {
//       res.send({"status": "403", "message": "User not logged in.", "isLoggedIn": false });
//     }
//
//     // if they aren't redirect them to the home page
// });
//
// router.get('/getRole', (req, res) => {
//     // if user is authenticated in the session, carry on
//     if ((req.session.passport)&&(req.session.passport.user.role)&&(req.session.passport.user != "")) {
//       res.send({"status": "200", "message": "User logged in.", "role": req.session.passport.user.role });
//     }
//     else {
//       res.send({"status": "403", "message": "User not logged in.", "role": "none" });
//     }
//
//     // if they aren't redirect them to the home page
// });

module.exports = router;
