sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"rosterplanningvk/rosterplanningvk/model/models",
	"sap/ui/core/BusyIndicator",
	"sap/m/MessageBox",
	"sap/ui/export/Spreadsheet",
	"sap/ui/export/library",
	"../util/service"
], function (Controller, JSONModel, models, BusyIndicator, MessageBox, Spreadsheet, exportLibrary, ServiceHandler) {
	"use strict";
	var EdmType = exportLibrary.EdmType;
	return Controller.extend("rosterplanningvk.rosterplanningvk.controller.CreateCustomRoster", {
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oRouter.getRoute("CreateCustomRoster").attachMatched(this._onRouteMatched, this);
			// this._onRouteMatched();

		},

		_onRouteMatched: async function (oEvent) {
			BusyIndicator.show(0);
			this.aDataToSave = [];
			this.RosterID = oEvent.getParameter("arguments").rosterId;
			var objModel = {};
			var aRoster = [];
			var oModel = new JSONModel();
			oModel.setData(objModel);
			this.getOwnerComponent().setModel(oModel, "RosteringListModel");
			this.RosteringListModel = this.getOwnerComponent().getModel("RosteringListModel");
			var oUserModel = new JSONModel();
			await oUserModel.loadData(sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/currentUser", null, false);
			oUserModel.dataLoaded().then(function () {
				sap.ui.getCore().setModel(oUserModel, "userapi");
				this._fnFetchJobTitle();
				this._fnFetchPlanningValue();
				this._fnFetchSchedulingValue();
				this._fnHandleColumn(this.getView().byId("sliderHandlingWidth").getValue());
				this._fnFetchListRoster(true);
			}.bind(this));

		},

		_getCurrentUser: function () {
			var oCurrData = sap.ui.getCore().getModel("userapi").getData();
			var sUserID = oCurrData.pUserId;
			oCurrData.fullName = (sUserID) ? sUserID : oCurrData.fullName;
			if (!oCurrData.fullName) {
				oCurrData = {
					name: "Default_User",
					displayName: "Default_User"
				};
			}
			return oCurrData;
		},

		_fnFetchPlanningValue: async function () {
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/fetchPlanning";
			var response = await ServiceHandler.get(this.sPath);
			if (response.status === 200) {
				this.RosteringListModel.setProperty("/planningValues", response.results);
			} else {
				this.RosteringListModel.setProperty("/planningValues", []);
				MessageBox.error("Data loading failed..!!");
			}
		},

		_fnFetchSchedulingValue: async function () {
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/fetchSchedulingStatus";
			var response = await ServiceHandler.get(this.sPath);
			if (response.status === 200) {
				this.RosteringListModel.setProperty("/schedulingValues", response.results);
			} else {
				this.RosteringListModel.setProperty("/schedulingValues", []);
				MessageBox.error("Data loading failed..!!");
			}
		},

		_fnFetchJobTitle: async function () {
			// this.RosteringListModel.setProperty("/jobTitles",models._columnList().JobTitle);
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/fetchPositions";
			var response = await ServiceHandler.get(this.sPath);
			if (response.status === 200) {
				this.RosteringListModel.setProperty("/jobTitles", response.results);
			} else {
				this.RosteringListModel.setProperty("/jobTitles", []);
				MessageBox.error("Data loading failed..!!");
			}
		},

		//set header
		_fnHeaders: function () {
			var oHeader = {
				"Content-Type": "application/json; charset=utf-8",
				"X-Content-Type-Options": "nosniff",
				"X-Frame-Options": "SAMEORIGIN",
				"X-XSS-Protection": "0; mode=block",
				"X-CSRF-Token": this.fetchTokenForSubmit(sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/api/rosterAssignment")
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

		_fnFetchListRoster: async function (loadColumn) {
			BusyIndicator.show(0);
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/fetchRosterDaysStructure?" + "ROSTER_HEADER_ID=" + this.RosterID;
			var response = await ServiceHandler.get(this.sPath);
			if (response.status === 200) {
				this.RosteringListModel.setProperty("/rosterItems", response.rows);
				this.RosteringListModel.setProperty("/rosterName", response.rosterName);
				this.RosteringListModel.setProperty("/customRosterStatus", response.rosterStatus);
				this.rosterDays = response.rosterDays;
				if (loadColumn) {
					this._createDynamicColumn(response.rosterDays);
				}
			} else {
				this.RosteringListModel.setProperty("/rosterItems", []);
				MessageBox.error("Data loading failed..!!");
				BusyIndicator.hide();
			}
		},

		onChangeSlider: function (oEvent) {
			BusyIndicator.show(0);
			var iValue = oEvent.getSource().getValue();
			this._fnHandleColumn(iValue);
			this._createDynamicColumn(this.rosterDays);
			// BusyIndicator.hide();
		},

		_fnHandleColumn: function (iValue) {
			if (iValue === 4) {
				this.sWidthDayType = "3.2rem";
				this.sWidthSchedulingStatus = "4.2rem";
				this.sWidthSlots = "6rem";
				this.sWidthTotalHours = "2.4rem";
				this.sWidthAction = "4rem";
			} else if (iValue === 5) {
				this.sWidthDayType = "4.0rem";
				this.sWidthSchedulingStatus = "5.5rem";
				this.sWidthSlots = "7.5rem";
				this.sWidthTotalHours = "3rem";
				this.sWidthAction = "5rem";
			} else if (iValue === 6) {
				this.sWidthDayType = "4.8rem";
				this.sWidthSchedulingStatus = "6rem";
				this.sWidthSlots = "9rem";
				this.sWidthTotalHours = "3.6rem";
				this.sWidthAction = "6rem";
			} else if (iValue === 7) {
				this.sWidthDayType = "5.4rem";
				this.sWidthSchedulingStatus = "7rem";
				this.sWidthSlots = "10.5rem";
				this.sWidthTotalHours = "4.2rem";
				this.sWidthAction = "7rem";
			} else if (iValue === 8) {
				this.sWidthDayType = "6.4rem";
				this.sWidthSchedulingStatus = "8rem";
				this.sWidthSlots = "12rem";
				this.sWidthTotalHours = "4.8rem";
				this.sWidthAction = "8rem";
			} else if (iValue === 9) {
				this.sWidthDayType = "7.2rem";
				this.sWidthSchedulingStatus = "8.5rem";
				this.sWidthSlots = "13.5rem";
				this.sWidthTotalHours = "5.4rem";
				this.sWidthAction = "9rem";
			} else {
				this.sWidthDayType = "8rem";
				this.sWidthSchedulingStatus = "9.2rem";
				this.sWidthSlots = "15rem";
				this.sWidthTotalHours = "6rem";
				this.sWidthAction = "10rem";
			}
			this.sWidthAction = this.sWidthTotalHours;

		},

		_createDynamicColumn: function (rosterDays) {
			BusyIndicator.show(0);
			var oRosteringListTable = this.getView().byId("tblRosteringList");
			oRosteringListTable.removeAllColumns([]);
			oRosteringListTable.destroyColumns();
			var aColumnData = [{
				"width": "8rem",
				"sortProperty": "JOB_TITLE",
				"filterProperty": "JOB_TITLE",
				"labels": [{
					"width": "100%",
					"textAlign": "Center",
					"text": "Job Title",
					"visible": true
				}],
				"templateBinding": "{RosteringListModel>JOB_TITLE}",
				"sEnabled": false,
				"sControl": "Text",
				"sModel": "RosteringListModel>/jobTitles",
				"sItemText": "{RosteringListModel>JOB_TITLE_DESC}",
				"sItemKey": "{RosteringListModel>JOB_CODE_ID}",
			}, {
				"width": "6rem",
				"sortProperty": "JOB_CODE",
				"filterProperty": "JOB_CODE",
				"labels": [{
					"width": "100%",
					"textAlign": "Center",
					"text": "Job Code",
					"visible": true
				}],
				"templateBinding": "{RosteringListModel>JOB_CODE}",
				"sEnabled": false,
				"sControl": "Text",
				"sModel": "RosteringListModel>/jobTitles",
				"sItemText": "{RosteringListModel>JOB_TITLE_DESC}",
				"sItemKey": "{RosteringListModel>JOB_CODE_ID}",
			}, {
				"width": "6rem",
				"sortProperty": "JOB_TITLE_SEQ_NO",
				"filterProperty": "JOB_TITLE_SEQ_NO",
				"labels": [{
					"width": "100%",
					"textAlign": "Center",
					"text": "Job Seq No",
					"visible": true
				}],
				"templateBinding": "{RosteringListModel>JOB_TITLE_SEQ_NO}",
				"sEnabled": false,
				"sControl": "Text"

			}];
			var sRosterDay = rosterDays;

			//dynamically column generation
			for (var l = 1; l <= sRosterDay; l++) {
				var uniqueCode = "545454";
				//Day type
				var headerSpan = "4,1";
				var sortProperty = "";
				var filterProperty = "";
				var sNameBinding = "{RosteringListModel>" + uniqueCode + "_SEQNO}";
				var sEnabled = true;
				var sControl = "Input";

				// this.sWidthDayType = "8rem";
				// this.sWidthSlots = "15rem";
				// this.sWidthTotalHours = "6rem";
				// this.sWidthAction = "10rem";
				var objDayType = {
					// "id": sId,
					"headerSpan": headerSpan,
					"width": this.sWidthDayType,
					"sortProperty": sortProperty,
					"filterProperty": filterProperty,
					"labels": [{
						"width": "100%",
						"textAlign": "Center",
						"text": "Day " + l.toString(),
						"visible": true
					}, {
						"width": "100%",
						"textAlign": "Center",
						"text": "Day Type",
						"visible": true
					}],
					"templateBinding": "{RosteringListModel>DAY_TYPE_" + l.toString() + "}",
					"nameBinding": sNameBinding,
					"sEnabled": sEnabled,
					"sControl": "ComboBox",
					"sModel": "RosteringListModel>/planningValues",
					"sItemText": "{RosteringListModel>LOOKUP_NAME}",
					"sItemKey": "{RosteringListModel>CODE}",
					"day": l.toString()
				};
				var objSchedulingStatus = {
					// "id": sId,
					"headerSpan": headerSpan,
					"width": this.sWidthSchedulingStatus,
					"sortProperty": sortProperty,
					"filterProperty": filterProperty,
					"labels": [{
						"width": "100%",
						"textAlign": "Center",
						"text": "Day " + l.toString(),
						"visible": true
					}, {
						"width": "100%",
						"textAlign": "Center",
						"text": "Schedule",
						"visible": true
					}],
					"templateBinding": "{RosteringListModel>SCHEDULE_STATUS_" + l.toString() + "}",
					"nameBinding": sNameBinding,
					"sEnabled": sEnabled,
					"sControl": "ComboBox",
					"sModel": "RosteringListModel>/schedulingValues",
					"sItemText": "{RosteringListModel>ACTUAL_SLOTS}",
					"sItemKey": "{RosteringListModel>SHIFT_CODE}",
					"day": l.toString()
				};
				var objDaySlots = {
					// "id": sId,
					"headerSpan": headerSpan,
					"width": this.sWidthSlots,
					"sortProperty": sortProperty,
					"filterProperty": filterProperty,
					"labels": [{
						"width": "100%",
						"textAlign": "Center",
						"text": "Day " + l.toString(),
						"visible": true
					}, {
						"width": "100%",
						"textAlign": "Center",
						"text": "Slots",
						"visible": true
					}],
					"templateBinding": "{RosteringListModel>SLOTS_" + l.toString() + "}",
					"nameBinding": sNameBinding,
					"sEnabled": false,
					"sControl": "Text",
					"day": l.toString()
				};
				var objDayTotalHours = {
					// "id": sId,
					"headerSpan": headerSpan,
					"width": this.sWidthTotalHours,
					"sortProperty": sortProperty,
					"filterProperty": filterProperty,
					"labels": [{
						"width": "100%",
						"textAlign": "Center",
						"text": "Day " + l.toString(),
						"visible": true
					}, {
						"width": "100%",
						"textAlign": "Center",
						"text": "Total Hours",
						"visible": true
					}],
					"templateBinding": "{RosteringListModel>TOTAL_HOURS_" + l.toString() + "}",
					"nameBinding": sNameBinding,
					"sEnabled": false,
					"sControl": "Text",
					"day": l.toString()
				};
				var objActions = {
					// "id": sId,
					"headerSpan": headerSpan,
					"width": this.sWidthAction,
					"sortProperty": sortProperty,
					"filterProperty": filterProperty,
					"labels": [{
						"width": "100%",
						"textAlign": "Center",
						"text": "Day " + l.toString(),
						"visible": true
					}, {
						"width": "100%",
						"textAlign": "Center",
						"text": "Edit",
						"visible": true
					}],
					// "templateBinding": sTemplateBinding,
					"nameBinding": "DAY_" + l.toString(),
					"sEnabled": sEnabled,
					"sControl": "Button",
					"day": l.toString()
				};
				aColumnData.push(objDayType);
				aColumnData.push(objSchedulingStatus);
				aColumnData.push(objDaySlots);
				aColumnData.push(objDayTotalHours);
				// aColumnData.push(objActions);
			}
			for (var k = 0; k < aColumnData.length; k++) {
				var oColumnData = aColumnData[k];
				var aMultiLabels = [];
				for (var t = 0; t < oColumnData.labels.length; t++) {
					var oLabel = new sap.m.Label({
						text: oColumnData.labels[t].text,
						tooltip: oColumnData.labels[t].text,
						design: "Bold",
						visible: oColumnData.labels[t].visible,
						width: oColumnData.labels[t].width,
						textAlign: oColumnData.labels[t].textAlign
					});
					aMultiLabels.push(oLabel);
				}
				var oColumnProperties = {
					width: oColumnData.width,
					headerSpan: oColumnData.headerSpan,
					sortProperty: oColumnData.sortProperty,
					filterProperty: oColumnData.filterProperty,
					multiLabels: aMultiLabels
				};
				var oTemplate;
				if (oColumnData.sControl === "ComboBox") {
					oTemplate = new sap.m.ComboBox({
						showSecondaryValues: true,
						filterSecondaryValues: true,
						selectedKey: oColumnData.templateBinding,
						name: oColumnData.nameBinding,
						change: function (oEvent) {
							this.onChange(oEvent);
						}.bind(this),
						enabled: oColumnData.sEnabled
					});
					if (oColumnData.sItemKey.indexOf('SHIFT_CODE') >= 0) {
						oTemplate.data("columnId", 'SCHEDULING_' + oColumnData.day);
					} else {
						oTemplate.data("columnId", 'IGNORE');
					}
					var oItemTemplate = new sap.ui.core.ListItem({
						text: oColumnData.sItemKey,
						key: oColumnData.sItemKey,
						additionalText: oColumnData.sItemText
					});
					oTemplate.bindItems({
						path: oColumnData.sModel,
						length: 5000,
						template: oItemTemplate
					});
				} else if (oColumnData.sControl === "Button") {
					oTemplate = new sap.m.Button({
						icon: "sap-icon://edit",
						type: "Emphasized",
						name: oColumnData.nameBinding,
						press: function (oEvent) {
							var oContextObj = oEvent.getSource().getBindingContext("RosteringListModel").getObject();
							var dayNumber = parseInt(oEvent.getSource().getAggregation("customData")[0].getValue().split("DAY_")[1], 10);
							var sPath = oEvent.getSource().getBindingContext("RosteringListModel").getPath();
							this._fnHandleSlotsFragment(oContextObj, dayNumber, sPath, oEvent);
						}.bind(this)
					});
					oTemplate.data("name", oColumnData.nameBinding);
				} else if (oColumnData.sControl === "Text") {
					oTemplate = new sap.m.Text({
						text: oColumnData.templateBinding,
						tooltip: oColumnData.templateBinding,
						name: oColumnData.nameBinding
					});
				} else {
					oTemplate = new sap.m.Input({
						value: oColumnData.templateBinding,
						tooltip: oColumnData.templateBinding,
						name: oColumnData.nameBinding,
						change: function (oEvent) {
							this.onChange(oEvent);
						}.bind(this),
						editable: oColumnData.sEnabled
					});
				}
				oColumnProperties.template = oTemplate;
				var oColumn = new sap.ui.table.Column(oColumnData.id, oColumnProperties);
				oRosteringListTable.addColumn(oColumn);
			}
			BusyIndicator.hide();
		},

		onChange: function (oEvent) {
			if (oEvent.getSource().data("columnId").indexOf('SCHEDULING_') >= 0) {
				var sPath = oEvent.getSource().getBindingContext("RosteringListModel").getPath();
				var oContext = this.RosteringListModel.getProperty(sPath);
				var schedulePath = oEvent.getSource().getSelectedItem().getBindingContext("RosteringListModel").getPath();
				var itemContext = this.RosteringListModel.getProperty(schedulePath);
				var changingDataDay = oEvent.getSource().data("columnId").split("SCHEDULING_")[1];
				this.RosteringListModel.setProperty(sPath + "/TOTAL_HOURS_" + changingDataDay, itemContext.TOTAL_HOURS);
				this.RosteringListModel.setProperty(sPath + "/SLOTS_" + changingDataDay, itemContext.ACTUAL_SLOTS);
			}
		},

		onPressAddSlotLocal: function (oEvent) {
			var aListSlot = this.RosteringListModel.getProperty(this.sBindPath);
			var oAddSlot = {
				"ROSTER_HEADER_ID": this.slotContext.ROSTER_HEADER_ID,
				"ROSTER_ITEM_ID": this.slotContext.ROSTER_ITEM_ID,
				"DAY_NUMBER": this.slotDayNumber,
				"ACTION": "NEW",
				"SLOT_NUMBER": "NA",
				"SLOT_NUMBER_COUNTER": "NA",
				"START_TIME": "00:00",
				"END_TIME": "00:00",
				"IS_DELETED": "N"
			};
			aListSlot.push(oAddSlot);
			this.RosteringListModel.setProperty(this.sBindPath, aListSlot);
		},

		onPressAddSlot: async function (oEvent) {
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/addSlot";
			var oPayload = {
				"ROSTER_HEADER_ID": this.slotContext.ROSTER_HEADER_ID,
				"ROSTER_ITEM_ID": this.slotContext.ROSTER_ITEM_ID,
				"DAY_NUMBER": this.slotDayNumber
			};
			var response = await ServiceHandler.post(this.sPath, oPayload);
			console.log(response)
			if (oData.data.status === 201) {
				// MessageBox.success("Roster Created Successfully..!!");
				this.RosteringListModel.setProperty(this.slotPath, oData.data.results);
			} else {
				MessageBox.error("Failed to add slots..!!");
			}
			BusyIndicator.hide();
			// var oJsonModel = new JSONModel();
			// var oHeader = this._fnHeaders();
			// oJsonModel.loadData(this.sPath, JSON.stringify(oPayload), true, "POST", false, false,
			// 	oHeader);
			// oJsonModel.attachRequestCompleted(function (jsonData, response) {
			// 	var oData = jsonData.getSource().getData();
			// 	if (oData.data.status === 201) {
			// 		// MessageBox.success("Roster Created Successfully..!!");
			// 		this.RosteringListModel.setProperty(this.slotPath, oData.data.results);
			// 	} else {
			// 		MessageBox.error("Failed to add slots..!!");
			// 	}
			// 	BusyIndicator.hide();
			// }.bind(this));
		},

		_fnFetchSlot: async function (oContextObj, oControl) {
			// this.sPath = sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/api/rosterManagement?cmd=fetchSlot";
			var param = "ROSTER_HEADER_ID=" + this.RosterID + "&ROSTER_ITEM_ID=" + oContextObj.ROSTER_ITEM_ID + "&DAY_NUMBER=" + this.slotDayNumber;
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/fetchSlot?" + param;
			// var oPayload = {
			// 	"ROSTER_HEADER_ID": this.RosterID,
			// 	"ROSTER_ITEM_ID": oContextObj.ROSTER_ITEM_ID,
			// 	"DAY_NUMBER": this.slotDayNumber
			// };
			var response = await ServiceHandler.get(this.sPath);
			console.log(response)
			if (oData.data.status === 200) {
				this.RosteringListModel.setProperty(this.sBindPath, oData.data.results);
				this._fnOpenSlotsFragment(oControl);
			} else {
				this.RosteringListModel.setProperty(this.sBindPath, []);
				MessageBox.error("Slot fetching failed..!!");
				BusyIndicator.hide();
			}
			// var oHeader = this._fnHeaders();
			// var oJsonModel = new JSONModel();
			// oJsonModel.loadData(this.sPath, JSON.stringify(oPayload), true, "POST", false, false,
			// 	oHeader);
			// oJsonModel.attachRequestCompleted(function (jsonData, response) {
			// 	var oData = jsonData.getSource().getData();
			// 	if (oData.data.status === 200) {
			// 		this.RosteringListModel.setProperty(this.sBindPath, oData.data.results);
			// 		this._fnOpenSlotsFragment(oControl);
			// 	} else {
			// 		this.RosteringListModel.setProperty(this.sBindPath, []);
			// 		MessageBox.error("Slot fetching failed..!!");
			// 		BusyIndicator.hide();
			// 	}

			// }.bind(this));
		},

		_fnHandleSlotsFragment: function (oContextObj, iDay, sPath, oEvent) {
			var oControl = oEvent.getSource();
			this.slotPath = sPath;
			this.sBindPath = sPath + "/ASLOTS_" + iDay;
			this.slotContext = oContextObj;
			this.slotDayNumber = iDay;

			this._fnFetchSlot(oContextObj, oControl);

		},

		_fnOpenSlotsFragment: function (oControl) {
			if (!this._popOverSlotFrag) {
				// create popover
				this._popOverSlotFrag = sap.ui.xmlfragment(this.createId("fragSlotPopover"),
					"rosterplanningvk.rosterplanningvk.fragment.slotPopover",
					this
				);
				this.getView().addDependent(this._popOverSlotFrag);
			}
			var oTemplate = new sap.m.ColumnListItem({
				cells: [new sap.m.Text({
					text: "{RosteringListModel>SLOT_NUMBER}"
				}),
				new sap.m.TimePicker({
					value: "{RosteringListModel>START_TIME}",
					valueFormat: "HH:mm",
					displayFormat: "HH:mm",
					valueState: "{RosteringListModel>VS_START_TIME}"
				}),
				new sap.m.TimePicker({
					value: "{RosteringListModel>END_TIME}",
					valueFormat: "HH:mm",
					displayFormat: "HH:mm",
					valueState: "{RosteringListModel>VS_END_TIME}"
				}),
				new sap.ui.core.Icon({
					src: "sap-icon://sys-cancel",
					press: function (oEvent) {
						BusyIndicator.show(0);
						// var oContextObj = oEvent.getSource().getBindingContext("RosteringListModel").getObject();
						var sPath = oEvent.getSource().getBindingContext("RosteringListModel").getPath();
						this.RosteringListModel.setProperty(sPath + "/IS_DELETED", "Y");
						this.RosteringListModel.refresh(true);
						// this._fnDeleteSlotsLocal(oEvent, oContextObj);
						// this._fnDeleteSlots(oEvent, oContextObj);
						BusyIndicator.hide(0);
					}.bind(this)
				})
				]
			});
			sap.ui.core.Fragment.byId(this.createId("fragSlotPopover"), "tblSlotList").bindItems({
				path: "RosteringListModel>" + this.sBindPath,
				template: oTemplate,
				filters: [new sap.ui.model.Filter("IS_DELETED", sap.ui.model.FilterOperator.EQ, 'N')]
			});
			this._popOverSlotFrag.openBy(oControl);
		},

		_fnDeleteSlotsLocal: function (oEvent, oContextObj) { },

		_fnDeleteSlots: function (oEvent, oContextObj) {
			this.sPath = sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/api/rosterManagement?cmd=deleteSlot";
			var oPayload = {
				"ROSTER_HEADER_ID": oContextObj.ROSTER_HEADER_ID,
				"ROSTER_ITEM_ID": oContextObj.ROSTER_ITEM_ID,
				"DAY_NUMBER": oContextObj.DAY_NUMBER,
				"SLOT_NUMBER": oContextObj.SLOT_NUMBER
			};
			var oJsonModel = new JSONModel();
			var oHeader = this._fnHeaders();
			oJsonModel.loadData(this.sPath, JSON.stringify(oPayload), true, "POST", false, false,
				oHeader);
			oJsonModel.attachRequestCompleted(function (jsonData, response) {
				var oData = jsonData.getSource().getData();
				if (oData.data.status === 202) {
					sap.m.MessageToast.show("Slot Deleted Successfully..!!");
					this.RosteringListModel.setProperty(this.slotPath, oData.data.results);
				} else {
					MessageBox.error("Failed to add slots..!!");
				}
				BusyIndicator.hide();
			}.bind(this));
		},

		onCancelPopOverSlots: function () {
			this._popOverSlotFrag.close();
		},

		_getTimeDifference: function (startTime, endTime) {
			var start = startTime.split(":");
			var end = endTime.split(":");
			var startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
			var endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
			var difference = endMinutes - startMinutes;
			return difference;
		},

		convertMinutesToHHmm: function (minutes) {
			var hours = Math.floor(minutes / 60);
			var remainingMinutes = minutes % 60;

			var hoursString = hours.toString().padStart(2, '0');
			var minutesString = remainingMinutes.toString().padStart(2, '0');

			return hoursString + ':' + minutesString;
		},

		onSaveSlotsLocal: function (oEvent) {
			this.sPath = sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/api/rosterManagement?cmd=saveSlot";
			var aPayload = this.RosteringListModel.getProperty(this.sBindPath);
			var isAllowedToSave = true;
			var slotText = "";
			var totalMinutes = 0;
			for (var t = 0; t < aPayload.length; t++) {
				var oPayload = aPayload[t];
				if (oPayload.IS_DELETED === "Y") {
					continue;
				}
				if (oPayload.ACTION && oPayload.ACTION === "NEW") {
					if (oPayload.START_TIME === "00:00" || !oPayload.START_TIME) {
						isAllowedToSave = false;
						oPayload.VS_START_TIME = "Error";
					}
					if (oPayload.END_TIME === "00:00" || !oPayload.END_TIME) {
						isAllowedToSave = false;
						oPayload.VS_END_TIME = "Error";
					}
					var iMinutes = this._getTimeDifference(oPayload.START_TIME, oPayload.END_TIME);
					if (iMinutes <= 0) {
						isAllowedToSave = false;
						oPayload.VS_START_TIME = "Error";
						oPayload.VS_END_TIME = "Error";
					} else {
						oPayload.VS_START_TIME = "None";
						oPayload.VS_END_TIME = "None";
					}

				}
				if (t > 0 && slotText.trim().length) {
					slotText = slotText + " | " + oPayload.START_TIME + " - " + oPayload.END_TIME;
					totalMinutes += this._getTimeDifference(oPayload.START_TIME, oPayload.END_TIME);
				} else {
					slotText = oPayload.START_TIME + " - " + oPayload.END_TIME;
					totalMinutes += this._getTimeDifference(oPayload.START_TIME, oPayload.END_TIME);
				}
			}
			if (!isAllowedToSave) {
				this.RosteringListModel.setProperty(this.sBindPath, aPayload);
				return MessageBox.error("Please correct slot data..!!");
			} else {
				var sTotalMin = this.convertMinutesToHHmm(totalMinutes);
				var oJsonModel = new JSONModel();
				var oHeader = this._fnHeaders();
				var oRequest = {};
				oRequest.payload = aPayload;
				oRequest.totalHours = sTotalMin;
				oRequest.rosterHeaderId = this.slotContext.ROSTER_HEADER_ID;
				oRequest.rosterItemId = this.slotContext.ROSTER_ITEM_ID;
				oRequest.sDayNumber = this.slotDayNumber;
				oJsonModel.loadData(this.sPath, JSON.stringify(oRequest), true, "POST", false, false,
					oHeader);
				oJsonModel.attachRequestCompleted(function (jsonData, response) {
					var oData = jsonData.getSource().getData();
					if (oData.data.status === 201) {
						sap.m.MessageToast.show("Slot saved successfully..!!");
						this.RosteringListModel.setProperty(this.slotPath + "/SLOTS_" + this.slotDayNumber, slotText);
						this.RosteringListModel.setProperty(this.slotPath + "/TOTAL_HOURS_" + this.slotDayNumber, sTotalMin);
						// this.RosteringListModel.setProperty(this.slotPath, oData.data.results);
						this.onCancelPopOverSlots();
					} else {
						MessageBox.error("Failed to save slots..!!");
					}
					BusyIndicator.hide();
				}.bind(this));
			}
			// return;
		},

		onSaveSlots: function (oEvent) {
			this.sPath = sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/api/rosterManagement?cmd=saveSlot";
			var aPayload = this.RosteringListModel.getProperty(this.sBindPath);
			var oJsonModel = new JSONModel();
			var oHeader = this._fnHeaders();
			oJsonModel.loadData(this.sPath, JSON.stringify(aPayload), true, "POST", false, false,
				oHeader);
			oJsonModel.attachRequestCompleted(function (jsonData, response) {
				var oData = jsonData.getSource().getData();
				if (oData.data.status === 201) {
					sap.m.MessageToast.show("Slot saved successfully..!!");
					this.RosteringListModel.setProperty(this.slotPath, oData.data.results);
					this.onCancelPopOverSlots();
				} else {
					MessageBox.error("Failed to save slots..!!");
				}
				BusyIndicator.hide();
			}.bind(this));
		},

		onPressCreateRostering: function (oEvent) {

			// create value help dialog
			if (!this._dlgCreateRoster) {
				this._dlgCreateRoster = sap.ui.xmlfragment(this.createId("frgCreateRoster"),
					"rosterplanningvk.rosterplanningvk.fragment.createRosterFrag",
					this
				);
				this.getView().addDependent(this._dlgCreateRoster);
			}
			this._dlgCreateRoster.open();
		},

		onPressAddRoster: function () {
			// create value help dialog
			if (!this._dlgAddRoster) {
				this._dlgAddRoster = sap.ui.xmlfragment(this.createId("frgAddRoster"),
					"rosterplanningvk.rosterplanningvk.fragment.addPositions",
					this
				);
				this.getView().addDependent(this._dlgAddRoster);
			}
			this._dlgAddRoster.open();
		},

		onSelectionChangePosition: function (oEvent) {
			var sText = oEvent.getParameter("selectedItem").getText();
			this.RosteringListModel.setProperty("/selectedJobTitleForRoster", sText);
		},

		handleFgAddRosterClose: function () {
			this._dlgAddRoster.close();
			this._dlgAddRoster.destroy();
			this._dlgAddRoster = null;
			this._dlgAddRoster = undefined;
		},

		handleFgAddRoster: function () {
			this._fnSaveAdhocDraft();
			// this._fnAddDefaultRoster();
			// this.handleFgAddRosterClose(false);
		},

		_fnSaveAdhocDraft: async function () {
			var aRosterItems = this.RosteringListModel.getProperty("/rosterItems");
			console.log(aRosterItems)
			BusyIndicator.show(0);
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/saveData";
			var response = await ServiceHandler.post(this.sPath, aRosterItems);
			if (response.status === 201) {
				this._fnAddDefaultRoster();
				this.handleFgAddRosterClose(false);
				/*MessageBox.success("Data Saved Successfully..!!");
				this._fnFetchListRoster(false);
				this.onNavBack();*/
			} else {
				MessageBox.error("Failed to save data..!!");
			}
			BusyIndicator.hide();
		},

		_fnAddDefaultRoster: async function () {
			BusyIndicator.show(0);
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/addDefaultRoster";
			var oPayload = {
				"ROSTER_HEADER_ID": this.RosterID,
				"JOB_TITLE": this.RosteringListModel.getProperty("/selectedJobTitleForRoster"),
				"JOB_CODE": this.RosteringListModel.getProperty("/selectedJobCodeForRoster"),
				"MODIFIED_BY": this._getCurrentUser().fullName
			};
			var response = await ServiceHandler.post(this.sPath, oPayload);
			if (response.status === 201) {
				MessageBox.success("Job Added Successfully..!!");
				this._fnFetchListRoster(false);

			} else {
				MessageBox.error("Failed to add position..!!");
			}
			BusyIndicator.hide();
		},

		onPressSave: async function () {
			var aRosterItems = this.RosteringListModel.getProperty("/rosterItems");
			BusyIndicator.show(0);
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/saveData";
			var response = await ServiceHandler.post(this.sPath, aRosterItems);
			if (response.status === 201) {
				MessageBox.success("Data Saved Successfully..!!");
				this._fnFetchListRoster(false);
				this.onNavBack();
			} else {
				MessageBox.error("Failed to save data..!!");
			}
			BusyIndicator.hide();
			// this.sPath = sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/api/rosterManagement?cmd=saveData";
			// var oHeader = this._fnHeaders();
			// var oJsonModel = new JSONModel();
			// oJsonModel.loadData(this.sPath, JSON.stringify(aRosterItems), true, "POST", false, false,
			// 	oHeader);
			// // oJsonModel.loadData(this.sPath, null, true, "GET", false, false);
			// oJsonModel.attachRequestCompleted(function (jsonData, response) {
			// 	var oData = jsonData.getSource().getData();
			// 	if (oData.data.status === 204) {
			// 		MessageBox.success("Data Saved Successfully..!!");
			// 		this._fnFetchListRoster(false);
			// 		this.onNavBack();
			// 	} else {
			// 		MessageBox.error("Failed to save data..!!");
			// 	}
			// 	BusyIndicator.hide();
			// }.bind(this));
		},

		onNavBack: function () {
			this.oRouter.navTo("RouteHome", true);
		},

		onPressSubmit: function () {
			if (this.aDataToSave.length === 0) {
				return sap.m.MessageToast.show("No changes done to save..!!");
			}
			MessageBox.confirm("Are you sure you want to submit the changes?", {
				title: "Confirm Submission",
				actions: ["Ok", "Cancel"],
				onClose: function (oAction) {
					if (oAction === "Ok") {
						// Perform deletion here
						this._fnSaveDefaultRoster();
					}
				}.bind(this)
			});
		},

		_fnSaveDefaultRoster: function () {
			BusyIndicator.show(0);
			this.sPath = sap.ui.require.toUrl("planningshiftrostering/planning") + "/Manning/viking/scheduling/xsjs/CopyJobTitleBasedSlotsRostering.xsjs?cmd=saveData";
			var oHeader = this._fnHeaders();
			var oJsonModel = new JSONModel();
			oJsonModel.loadData(this.sPath, JSON.stringify(this.aDataToSave), true, "POST", false, false,
				oHeader);
			// oJsonModel.loadData(this.sPath, null, true, "GET", false, false);
			oJsonModel.attachRequestCompleted(function (jsonData, response) {
				var oData = jsonData.getSource().getData();
				if (oData.data.status === 202) {
					MessageBox.success("Data Saved Successfully..!!");
					this.aDataToSave = [];
					this._fnFetchListRoster(false);
				} else {
					MessageBox.error("Failed to save data..!!");
				}
				BusyIndicator.hide();
			}.bind(this));
		},

		onPressCancel: function () {
			if (this.aDataToSave.length === 0) {
				this.navBack();
			} else {
				MessageBox.confirm("Are you sure you want to abort all the changes?", {
					title: "Confirm Submission",
					actions: ["Ok", "Cancel"],
					onClose: function (oAction) {
						if (oAction === "Ok") {
							// Perform deletion here
							this.aDataToSave = [];
							this.navBack();
						}
					}.bind(this)
				});
			}

		},

		navBack: function () {
			var oRosteringListTable = this.getView().byId("tblRosteringList");
			oRosteringListTable.removeAllColumns([]);
			oRosteringListTable.destroyColumns();
			this.oRouter.navTo("RouteHome", true);
		},

		handleFgCreateClose: function () {
			this._dlgCreateRoster.close();
			this._dlgCreateRoster.destroy();
			this._dlgCreateRoster = null;
			this._dlgCreateRoster = undefined;
		},

		handleFgProceedCreateRoster: function () {
			var oRosteringListModel = this.getOwnerComponent().getModel("RosteringListModel");
			var sPosition = oRosteringListModel.getProperty("/selectedPositionForCustomRoster");
			var sWeeks = oRosteringListModel.getProperty("/rosteringWeeks");
			this.oRouter.navTo("CreateCustomRoster");
		},

		onPressDeleteRoster: function () {
			BusyIndicator.show(0);
			var oTable = this.byId("tblRosteringList");
			var aSelectedIndices = oTable.getSelectedIndices();
			if (!aSelectedIndices.length) {
				BusyIndicator.hide();
				return MessageBox.error("No positions selected for deletion..!!");
			} else {
				MessageBox.confirm("Are you sure you want to delete the position?", {
					title: "Delete Positions Confirmation?",
					actions: ["Ok", "Cancel"],
					onClose: function (oAction) {
						if (oAction === "Ok") {
							// Perform deletion here
							BusyIndicator.show(0);
							this._fnDeleteRosters();
						}
					}.bind(this)
				});
				BusyIndicator.hide();
			}
		},

		_fnDeleteRosters: async function () {
			var oTable = this.byId("tblRosteringList");
			var aSelectedIndices = oTable.getSelectedIndices();
			var aDataToDelete = [];
			for (var i = 0; i < aSelectedIndices.length; i++) {
				var index = aSelectedIndices[i];
				var sRelativePath = "/rosterItems/" + index
				var oSelectedItem = this.RosteringListModel.getProperty(sRelativePath);
				aDataToDelete.push({
					"ROSTER_HEADER_ID": oSelectedItem.ROSTER_HEADER_ID,
					"ROSTER_ITEM_ID": oSelectedItem.ROSTER_ITEM_ID,
					"MODIFIED_BY": this._getCurrentUser().fullName
				});
			};
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/deletePosition";
			var response = await ServiceHandler.delete(this.sPath, aDataToDelete);
			if (response.status === 202) {
				MessageBox.success("Roster Deleted Successfully..!!");
				this._fnFetchListRoster(false);
				oTable.setSelectedIndex(-1);
			} else {
				MessageBox.error("Failed to delete roster..!!");
			}
			BusyIndicator.hide();
		},

		onChangeRosterStatus: async function (oEvent) {
			BusyIndicator.show(0);
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/markRosterStatus";
			var sState = oEvent.getSource().getState();
			var sStateValue = "ACTIVE";
			if (sState) {
				sStateValue = "ACTIVE";
			} else {
				sStateValue = "DRAFT";
			}
			var iRosterId = this.RosterID;
			var oPayload = {
				"STATUS": sStateValue,
				"ROSTER_HEADER_ID": iRosterId,
				"MODIFIED_BY": this._getCurrentUser().fullName
			};
			var response = await ServiceHandler.put(this.sPath, oPayload);
			if (response.status === 202) {
				MessageBox.success("Roster Updated Successfully..!!");
			} else {
				MessageBox.error("Failed to update roster..!!");
			}
			BusyIndicator.hide();
		},

		onPressExport: async function () {
			BusyIndicator.show(0);
			this.sPath = sap.ui.require.toUrl("rosterplanningvk/rosterplanningvk") + "/api/roster/rosterManagement/downloadData?rosterId=" + this.RosterID;
			var response = await ServiceHandler.get(this.sPath);
			if (response.status === 200) {
				this._fnDownloadData(response.results);
				// this.RosteringListModel.setProperty("/rosterList", oData.data.results);
			} else {
				this.RosteringListModel.setProperty("/rosterList", []);
				MessageBox.error("Data loading failed..!!");
			}
			BusyIndicator.hide();
		},

		createColumnConfig: function () {
			return [{
				label: "Roster Name",
				property: "ROSTER_NAME"
			}, {
				label: "Roster Code",
				property: "ROSTER_CODE"
			}, {
				label: "Job Title",
				property: "JOB_TITLE"
			}, {
				label: "Job Code",
				property: "JOB_CODE"
			}, {
				label: "Job Title Seq No",
				property: "JOB_TITLE_SEQ_NO"
			}, {
				label: "Planning Status",
				property: "PLANNING_STATUS"
			}, {
				label: "Scheduling Status",
				property: "SHIFT_CODE"
			}, {
				label: "Day No",
				property: "DAY_NUMBER"
			}, {
				label: "Slots",
				property: "SLOTS"
			}, {
				label: "Total Hours",
				property: "TOTAL_HOURS"
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
				fileName: "Roster_" + this.RosteringListModel.getProperty("/rosterName") + ".xlsx"
			};
			oSheet = new Spreadsheet(oSettings);
			oSheet.build().then(function () {
				sap.m.MessageToast.show("Roster Downloaded successfully..!!");
			}).finally(oSheet.destroy);
		},
	});
});