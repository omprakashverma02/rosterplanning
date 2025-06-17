sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"rosterplanningvk/rosterplanningvk/model/models",
	"sap/ui/core/BusyIndicator",
	"sap/m/MessageBox",
	"rosterplanningvk/rosterplanningvk/enum/xlsx.core.min",
	"sap/ui/export/Spreadsheet",
	"sap/ui/export/library",
	 "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (Controller, JSONModel, models, BusyIndicator, MessageBox, XLSXLib, Spreadsheet, exportLibrary,Filter,FilterOperator) {
	"use strict";

	var EdmType = exportLibrary.EdmType;

	return Controller.extend("rosterplanningvk.rosterplanningvk.controller.Home", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf viking.planningshiftrostering.planning.view.CreateCustomRoster
		 */
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oRouter.getRoute("RouteHome").attachMatched(this._onRouteMatched, this);
			this._onRouteMatched();

		},
		_onRouteMatched: function (oEvent) {
			var oModel = new JSONModel();
			this.getOwnerComponent().setModel(oModel, "RosteringListModel");
			this.RosteringListModel = this.getOwnerComponent().getModel("RosteringListModel");
			var oUserModel = new JSONModel();
			//oUserModel.loadData("/services/userapi/currentUser", null, true);
			BusyIndicator.show(0);
            oUserModel.loadData(sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/api/userProfile", null, false);
			oUserModel.dataLoaded().then(function () {
				sap.ui.getCore().setModel(oUserModel, "userapi");
				this._fnFetchListRoster();
			}.bind(this));
			
		},
		_getCurrentUser: function () {
			var oCurrData = sap.ui.getCore().getModel("userapi").getData();
			var sUserID = oCurrData.data[0].userDetail[0].USERID;
			oCurrData.name = (sUserID) ? sUserID : oCurrData.data.userDetail[0].FIRSTNAME;
			if (!oCurrData.name) {
				oCurrData = {
					name: "Default_User",
					displayName: "Default_User"
				};
			}
			return oCurrData;
		},
		_fnHeaders: function () {
			var oHeader = {
				"Content-Type": "application/json; charset=utf-8",
				"X-Content-Type-Options": "nosniff",
				"X-Frame-Options": "SAMEORIGIN",
				"X-XSS-Protection": "0; mode=block",
				"X-CSRF-Token": this.fetchTokenForSubmit(sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/viking/scheduling/xsjs/SaveAsFilter.xsjs")
			};
			return oHeader;
		},
		//Fetch Token for Making an OData call
		fetchTokenForSubmit: function (requestUrl) {
			var token = "";
			$.ajax({
				type: 'GET',
				url: requestUrl,
				async: false,
				beforeSend: function (requestGET) {
					requestGET.setRequestHeader('X-CSRF-Token', 'Fetch');
				},
				success: function (data, textStatus, requestGET) {
					token = requestGET.getResponseHeader("X-CSRF-Token");
				},
				error: function (requestGET) {
					token = requestGET.getResponseHeader("X-CSRF-Token");
				}
			});
			return token;
		},
		onPressDeleteRoster: function () {
			BusyIndicator.show(0);

			var oTable = this.getView().byId("tblCustomRoster");
			// var oSelectedItems = oTable.getSelectedItems();
			var aSelectedIndices = oTable.getSelectedIndices();
			if (!aSelectedIndices.length) {
				BusyIndicator.hide();
				return MessageBox.error("No roster selected for deletion..!!");
			} else {
				MessageBox.confirm("Are you sure you want to delete the roster? \n\n Please note, roster which are not having any roster assignment are elligible for deletion.", {
					title: "Delete Roster Confirmation?",
					actions: ["Ok", "Cancel"],
					onClose: function (oAction) {
						if (oAction === "Ok") {
							// Perform deletion here
							BusyIndicator.show(0);
							this._fnDeleteRoster();
						}
					}.bind(this)
				});
				BusyIndicator.hide();
			}

		},
		_fnDeleteRoster: function () {                                                              
			this.sPath = sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/api/rosterManagement?cmd=deleteRoster";
			var oJsonModel = new JSONModel();
			var aRequestData = [];
			var oTable = this.getView().byId("tblCustomRoster");
			var aSelectedIndices = oTable.getSelectedIndices();
			for (var t = 0; t < aSelectedIndices.length; t++) {
				// var oSelectedItem = aSelectedIndices[t];
				var index = aSelectedIndices[t];
				var sRelativePath = "/rosterList/" + index;

				var oSelectedItem = this.RosteringListModel.getProperty(sRelativePath);
				// var oContextObj = oSelectedItem.getBindingContext("RosteringListModel").getObject();
				var oRequestData = {
					ROSTER_HEADER_ID: oSelectedItem.ROSTER_HEADER_ID,
					"MODIFIED_BY": this._getCurrentUser().name,
					"ROSTER_NAME": oSelectedItem.ROSTER_NAME
				};
				aRequestData.push(oRequestData);
			}

			var oHeader = this._fnHeaders();
			oJsonModel.loadData(this.sPath, JSON.stringify(aRequestData), true, "POST", false, false,
				oHeader);
			// oJsonModel.loadData(this.sPath, null, true, "GET", false, false);
			oJsonModel.attachRequestCompleted(function (jsonData, response) {
				var oData = jsonData.getSource().getData();
				if (oData.data.status === 202) {
					MessageBox.success(oData.data.message);
					this._fnFetchListRoster();
				} else {
					// MessageBox.error("Failed to delete roster..!!");
					MessageBox.error(oData.data.message);
					this._fnFetchListRoster();
				}
				BusyIndicator.hide();
			}.bind(this));
		},

		onPressCreateRostering: function (oEvent) {
			this.RosteringListModel.setProperty("/customRosterName", "");
			this.RosteringListModel.setProperty("/customRosterCode", "");
			this.RosteringListModel.setProperty("/customRosterDays", "7");
			this.RosteringListModel.setProperty("/customRosterStatus", true);
			// create value help dialog
			if (!this._dlgCreateRoster) {
				this._dlgCreateRoster = sap.ui.xmlfragment(this.createId("frgCreateRoster"),
					"planningshiftrostering.planning.fragment.createRosterFrag",
					this
				);
				this.getView().addDependent(this._dlgCreateRoster);
			}
			this._dlgCreateRoster.open();
		},
		onPressCancelCustomRoster: function () {
			this._dlgCreateRoster.close();
			this._dlgCreateRoster.destroy();
			this._dlgCreateRoster = null;
			this._dlgCreateRoster = undefined;
		},
		_fnFetchListRoster: function () {
			BusyIndicator.show(0);
			this.sPath = sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/api/rosterManagement?cmd=fetchRoster";
			var oJsonModel = new JSONModel();
			oJsonModel.loadData(this.sPath, null, true, "GET", false, false);
			oJsonModel.attachRequestCompleted(function (jsonData, response) {
				var oData = jsonData.getSource().getData();
				if (oData.data.status === 1) {
					this.RosteringListModel.setProperty("/rosterList", oData.data.results);
				} else {
					this.RosteringListModel.setProperty("/rosterList", []);
					MessageBox.error("Data loading failed..!!");
				}
				BusyIndicator.hide();
			}.bind(this));
		},
		onPressRefresh: function () {
			this._fnFetchListRoster();
		},
		onPressCreateCustomRoster: function () {
			this._fnCreateRoster();
		},
		_fnCreateRoster: function () {
			BusyIndicator.show(0);
			this.sPath = sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/api/rosterManagement?cmd=createRoster";
			var oJsonModel = new JSONModel();
			var sCustomRosterName = this.RosteringListModel.getProperty("/customRosterName");
			var sCustomRosterCode = this.RosteringListModel.getProperty("/customRosterCode");
			var sDay = this.RosteringListModel.getProperty("/customRosterDays");
			var sStatus = this.RosteringListModel.getProperty("/customRosterStatus");
			sStatus = "DRAFT";
			/*if (sStatus) {
				sStatus = "ACTIVE";
			} else {
				sStatus = "DRAFT";
			}*/
			if (!sCustomRosterName.trim().length || !sCustomRosterCode.trim().length || !sStatus.trim().length || !sDay.trim().length) {
				BusyIndicator.hide();
				return MessageBox.error("Please provide all the required fields..!!");
			} else {
				var oPayload = {
					"ROSTER_NAME": sCustomRosterName,
					"ROSTER_CODE": sCustomRosterCode,
					"DAY": sDay,
					"MODIFIED_BY": this._getCurrentUser().name,
					"STATUS": sStatus
				};
				var oHeader = this._fnHeaders();
				oJsonModel.loadData(this.sPath, JSON.stringify(oPayload), true, "POST", false, false,
					oHeader);
				// oJsonModel.loadData(this.sPath, null, true, "GET", false, false);
				oJsonModel.attachRequestCompleted(function (jsonData, response) {
					var oData = jsonData.getSource().getData();
					if (oData.data.status === 201) {
						MessageBox.success("Roster Created Successfully..!!");
						this._fnFetchListRoster();
						this.onPressCancelCustomRoster();
					} else if (oData.data.status === 409) {
						MessageBox.error("Data with same roster code is already exists..!!");
						/*this._fnFetchListRoster();
						this.onPressCancelCustomRoster();*/
					} else {
						MessageBox.error("Failed to create roster..!!");
					}
					BusyIndicator.hide();
				}.bind(this));
			}

		},
		onPressRosterName: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext("RosteringListModel").getObject();
			this.oRouter.navTo("CreateCustomRoster", {
				rosterId: oContext.ROSTER_HEADER_ID
			});
		},
		handleUploadChange: function (oEvent) {
			try{
				BusyIndicator.show(0);
			var oFileUploader = oEvent.getSource();
			var file = oFileUploader.oFileUpload.files[0];
			this.handleMassUpload(file);}
			catch(oError){
				
			}finally{
				BusyIndicator.hide();
			}
		},
		/**
		 * on Press Extract Data from the Excel template
		 */
		handleMassUpload: function (file, isVariant) {
			if (file && window.FileReader) {
				var that = this;
				var excelReader = (XLSX) ? XLSX : "";
				var reader = new FileReader();
				//handler for the load event
				reader.onload = function (e) {
					var data = e.target.result;
					var binary = "";
					var bytes = new Uint8Array(data);
					var length = bytes.byteLength;
					for (var i = 0; i < length; i++) {
						binary += String.fromCharCode(bytes[i]);
					}
					var workbook = excelReader.read(binary, {
						type: "binary",
						cellDates: true,
						cellStyles: true
					});

					try {
						if (workbook.SheetNames instanceof Array && workbook.SheetNames.length >= 1) {
							var sheetName = "";
							var excelData = {};
							for (var s = 0; s < workbook.SheetNames.length; s++) {
								sheetName = workbook.SheetNames[s];
								sheetName = workbook.SheetNames[s];
								excelData = excelReader.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
								break;
							}
							that._fnUploadMass(excelData);
							// that.isMassUpload = false;
							// ArticleCreationUtility._fnPopulateTemplateData(excelData, file.name, sheetName, isVariant, that);
							// that.getView().byId("page").setBusy(false);
						}
					} catch (exc) {
						sap.m.MessageToast.show("Mass Upload Error");
					}
				}.bind(this);
				//handler for the error event
				reader.onerror = function (ex) {
					sap.m.MessageToast.show("Mass Upload Error");
				};
				reader.readAsArrayBuffer(file);
			}
		},
		_fnUploadMass: function (aRequestData) {
			aRequestData[0].MODIFIED_BY = this._getCurrentUser().name;
			this.sPath = sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/api/rosterManagement?cmd=massUpload";
			var oJsonModel = new JSONModel();
			var oHeader = this._fnHeaders();
			oJsonModel.loadData(this.sPath, JSON.stringify(aRequestData), true, "POST", false, false,
				oHeader);
			oJsonModel.attachRequestCompleted(function (jsonData, response) {
				var oData = jsonData.getSource().getData();
				if (oData.data.status === 201) {
					MessageBox.success("Roster Created Successfully..!!");
					this._fnFetchListRoster();
					// this.onPressCancelCustomRoster();
				} else {
					MessageBox.error("Failed to create roster..!!");
				}
				BusyIndicator.hide();
			}.bind(this));
		},
		onPressDownloadTemplate: function () {
			window.open(sap.ui.require.toUrl("planningshiftrostering/planning") + "/enum/RosterSample.xlsx", "_blank");
		},
		onPressExport: function () {
			var aData = this.RosteringListModel.getProperty("/rosterList");
			this._fnDownloadData(aData);
			/*BusyIndicator.show(0);
			this.sPath = "/Manning/api/rosterManagement?cmd=downloadData";
			var oJsonModel = new JSONModel();
			oJsonModel.loadData(this.sPath, null, true, "GET", false, false);
			oJsonModel.attachRequestCompleted(function (jsonData, response) {
				var oData = jsonData.getSource().getData();
				if (oData.data.status === 1) {
					this._fnDownloadData(oData.results);
					// this.RosteringListModel.setProperty("/rosterList", oData.results);
				} else {
					this.RosteringListModel.setProperty("/rosterList", []);
					MessageBox.error("Data loading failed..!!");
				}
				BusyIndicator.hide();
			}.bind(this));*/
		},
		createColumnConfig: function () {
			return [{
				label: "Roster Name",
				property: "ROSTER_NAME"
			}, {
				label: "Roster Code",
				property: "ROSTER_CODE"
			}, {
				label: "Rostering Days",
				property: "DAY"
			}, {
				label: "Modified By",
				property: "MODIFIED_BY"
			}, {
				label: "Modified On",
				property: "FORMAT_MODIFIED_ON"
			}, {
				label: "Roster Status",
				property: "STATUS"
			}];
		},
		_fnDownloadData: function (aData) {
			var aCols, oSettings, oSheet;

			aCols = this.createColumnConfig();
		
			oSettings = {
				workbook: {
					columns: aCols
				},
				dataSource: aData,
				 fileName: "Roster.xlsx"
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build()
				.then(function () {
					sap.m.MessageToast.show("Roster Downloaded successfully..!!");
				})
				.finally(oSheet.destroy);
		},
		onSearch:function(oEvent){
			var oBinding = this.getView().byId("tblCustomRoster").getBinding("rows");
				var sValue = oEvent.getParameter("query");
				var oFilterRosterName = new Filter("ROSTER_NAME", FilterOperator.Contains, sValue);   
                var oFilterRosterCode = new Filter("ROSTER_CODE", FilterOperator.Contains, sValue);  
                var oFilterDay = new Filter("DAY", FilterOperator.EQ, sValue);   
                var oFilterModifiedBy = new Filter("MODIFIED_BY", FilterOperator.Contains, sValue);  
                var oFilterModifiedOn = new Filter("FORMAT_MODIFIED_ON", FilterOperator.Contains, sValue);   
                var oFilterStatus = new Filter("STATUS", FilterOperator.Contains, sValue);  
                var oFilter = new sap.ui.model.Filter({
                    filters: [oFilterRosterName,oFilterRosterCode,oFilterDay,oFilterModifiedBy,oFilterModifiedOn,oFilterStatus],
                    and: false
                });
                oBinding.filter(oFilter);
		}
	});
});