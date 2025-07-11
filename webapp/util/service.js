sap.ui.define([
    "sap/ui/model/json/JSONModel"
], function (JSONModel) {
    "use strict";

    var ServiceHandler = {
        get: async function (sUrl) {
            var oModel = new JSONModel();
            await oModel.loadData(sUrl, null, true, "GET", false, false);
            return oModel.getData();
        },
        post: async function (sUrl, oData) {
            var oModel = new JSONModel();
            var mHeaders = {
                "Content-Type": "application/json; charset=utf-8"
            };
            await oModel.loadData(sUrl, JSON.stringify(oData), true, "POST", false, false, mHeaders);
            return oModel.getData();
        },
        put: async function (sUrl, oData) {
            var oModel = new JSONModel();
            var mHeaders = {
                "Content-Type": "application/json; charset=utf-8"
            };
            await oModel.loadData(sUrl, JSON.stringify(oData), true, "PUT", false, false, mHeaders);
            return oModel.getData();
        },
        delete: async function (sUrl, oData) {
            var oModel = new JSONModel();
            var mHeaders = {
                "Content-Type": "application/json; charset=utf-8"
            };
            await oModel.loadData(sUrl, JSON.stringify(oData), true, "DELETE", false, false, mHeaders);
            return oModel.getData();
        }
    };

    return ServiceHandler;
});
