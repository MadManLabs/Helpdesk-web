var app = angular.module("myApp", ['ngRoute']);

// Route configarations

app.config(
	['$routeProvider', function($routeProvider) {
		$routeProvider
			.when('/join/:helpdesk', { templateUrl: 'views/joinView.html', controller: 'joinController'})
			.when('/helpdesk/:name', { templateUrl: 'views/helpdeskView.html', controller: 'helpdeskController'})
			.otherwise({ templateUrl: 'views/homeView.html', controller: 'homeViewController'} );
	}]
);

// App run
app.run(
	function($rootScope) {
		//Enable tooltip and popover
		$rootScope.$on('$viewContentLoaded', function () {
				$(document).ready(function(){
						$('[data-toggle="popover"]').popover();
						$('[data-toggle="tooltip"]').tooltip();
				});
				$(document).foundation();
		});
});

// Data factory
app.factory("Data", 
	function () {
		var storage = {
			model: {
					name: "",
					units: [],
					tutors: [],
					helps: []
			},

			save: function () {
					sessionStorage.helpdeskData = angular.toJson(storage.model);
			},

			restore: function () {
					if(!sessionStorage.helpdeskData)
					{
						this.sample();
					}else{
						storage.model = angular.fromJson(sessionStorage.helpdeskData);
					}
			},
			clear: function ()
			{
				storage.model.units = [];
				storage.model.tutors = [];
				storage.model.helps = [];
			},
			sample: function ()
			{
				storage.model.name = "swin";
				storage.model.units = [{name:'INTRO',color:'#2865A8'},{name:'OOP',color:'#E99D3E'},{name:'WEB',color:'#4DB3D6'},{name:'OTHER',color:'#000000'}];
				storage.model.tutors = [];//[{name:'Isuru',subject:'INTRO'},{name:'James',subject:'INTRO'},{name:'Tien',subject:'OOP'},{name:'Olivia',subject:'WEB'}];
				storage.model.helps = [];//[{student:{name:'Sri',subject:'INTRO'},progress:'97',description:'Task 5.2'}];
			}
		};

		return {
			queue: function () {
				return storage.model.helps;
			},
			help: function (name) {
				var result = null;
				angular.forEach(storage.model.helps, function (help) {
					if (help.student.name === name) {
						result = help;
					}
				});
				return result;
			},
			tutors: function () {
				return storage.model.tutors;
			},
			units: function () {
				return storage.model.units;
			},
			store: function()
			{
				return storage;
			},
			name: function()
			{
				return storage.model.name;
			}
		};
	}
);

// Other Controllers

app.controller ("helpdeskController",
	function ($scope, $routeParams, $interval, Data, $http)
	{
		Data.store().restore();
		$scope.name = $routeParams.name;
		$scope.units = Data.units(); 
		$scope.tutors = Data.tutors(); 
		$scope.queue = Data.queue();
		$scope.message = "Welcome to the Programming Helpdesk!";
		$scope.QREnabled = false;
		$scope.timerEnabled = false;
		$scope.locked = false;
		$scope.lockedStyle = "active";
	
		$scope.Lock = function ()
		{
			$scope.locked = !$scope.locked;
			$scope.lockedStyle = ($scope.locked)?"disabled" : "active";
		}
		$scope.Requeue = function(help)
		{
			
			$scope.queue.splice($scope.queue.indexOf(help),1);
			help.progress = 0;
			if(help.tutor) help.tutor = $scope.ReassignTutor(help.tutor);
			$scope.queue.push(help);
			Data.store().save();
		}
		
		$scope.Dequeue = function(help)
		{
			if(help.tutor) $scope.ReassignTutor(help.tutor);
			$scope.queue.splice($scope.queue.indexOf(help),1);
			Data.store().save();
		}
		
		$scope.ShiftUp = function(help)
		{
			var DownIndex = $scope.queue.indexOf(help);
			var UpIndex = DownIndex - 1;
			if(UpIndex<0) return;
			$scope.queue[DownIndex] = $scope.queue[UpIndex];
			$scope.queue[UpIndex] = help;
			Data.store().save();
		}
		
		$scope.ShiftDown = function(help)
		{
			var UpIndex = $scope.queue.indexOf(help);
			var DownIndex = UpIndex + 1;
			if(DownIndex>=$scope.queue.length) return;
			$scope.queue[UpIndex] = $scope.queue[DownIndex];
			$scope.queue[DownIndex] = help;
			Data.store().save();
		}
		
		$scope.unitToColor = function (unitName)
		{
			for(unit in $scope.units)
			{
				if($scope.units[unit].name==unitName)
				{
					return $scope.units[unit].color;
				}
			}
			return "black";
		}
		
		$scope.AddStudentToQueue = function(inputStudent,inputDescription,inputRequest)
		{
			if(inputStudent.name)
			{
				var input = {name:inputStudent.name,subject:inputStudent.subject};
				var userDiscription = inputDescription;
				if(inputRequest!="Any Tutor")
					$scope.queue.push({student:input,request:inputRequest,progress:'0',description:userDiscription});
				else
					$scope.queue.push({student:input,progress:'0',description:userDiscription});
				Data.store().save();
			}
		}
		
		$scope.AddTutor = function(tutor)
		{
			var input = {name:tutor.name,subject:tutor.subject};
			if(tutor) $scope.tutors.push(input);
			Data.store().save();
		}
		
		$scope.AddUnit = function(unit)
		{
			var input = {name:unit.name,color:unit.color};
			if(unit) $scope.units.push(input);
			Data.store().save();
		}
		
		$scope.ResignTutor = function(t)
		{
			$scope.tutors.splice($scope.tutors.indexOf(t),1);
			//Resign from queue
			for(help in $scope.queue)
			{
				if($scope.queue[help].tutor)
				{
					if($scope.queue[help].tutor.name == t.name)
					{
						$scope.queue[help].tutor = 0;
						break;
					}
				}
			}
			Data.store().save();
		}
		
		$scope.ShiftTutor = function (t)
		{
			for(spot in $scope.queue)
			{
				if($scope.queue[spot].tutor)
				{
					if($scope.queue[spot].tutor.name==t.name)
					{
						$scope.Requeue($scope.queue[spot]);
						return;
					}
				}
			}
			//Tutor entering the queue
			for(spot in $scope.queue)
			{
				if($scope.queue[spot].student.subject==t.subject)
				{
					if(!$scope.queue[spot].tutor)
					{
						if($scope.queue[spot].request)
						{
							if($scope.queue[spot].request==t.name)
							{
								$scope.queue[spot].tutor = t;
								return;
							}
						}else
						{
							$scope.queue[spot].tutor = t;
							return;
						}
					}
				}
			}
		}
		
		$scope.ReassignTutor = function(t)
		{
			for(spot in $scope.queue)
			{
				if(!($scope.queue[spot].tutor))
				{
					if($scope.queue[spot].student.subject == t.subject)
					{
						if($scope.queue[spot].request)
						{
							//Student with a request found
							if($scope.queue[spot].request==t.name)
							{
								$scope.queue[spot].tutor = t;
								//to be filled for the tutor spot of the current help
								return 0;
							}
						}
						else
						{
							$scope.queue[spot].tutor = t;
							return 0;
						}
					}
				}
			}
			//couldn't find other students
			return t;
			Data.store().save();
		}
		
		$scope.resetAllTimes = function()
		{
			if($scope.timerEnabled)
			{
				for(help in $scope.queue)
				{
					$scope.queue[help].progress=0;
				}	
			}
			Data.store().save();
		}
		
		$scope.updateProgress = function()
		{
			if($scope.timerEnabled)
			{
				for(help in $scope.queue)
				{
					if($scope.queue[help].tutor)
					{
						$scope.queue[help].progress=parseInt($scope.queue[help].progress)+1;
						if($scope.queue[help].progress>100)
						{
							$scope.Requeue($scope.queue[help]);
							Data.store().save();
						}
					}
				}	
			}
		}
		
		$scope.refreshQueue = function()
		{
			
		}
		
		//Timer
		$interval($scope.updateProgress, 1000);
	}
);

app.controller('joinController', 
	function($scope, $routeParams){
		$scope.helpdesk = ($routeParams.helpdesk)?$routeParams.helpdesk:"helpdesk";
		$scope.sendRequest = function(student,request)
		{
			
		}
});

app.controller('homeViewController',
	function($scope, $routeParams, $location) {
		$scope.createHelpdesk = function(helpdesk)
		{
			if(!helpdesk.online)
			{
					$location.url('/helpdesk/'+helpdesk.name);
			}
		};
});

// Services
app.service('Database', function() {
	this.getRequests = function (helpdesk_id) {
		var url = "process.php/requests/helpdesk/"+helpdesk_id;
		$http.get(url)
			.then (function(response) {
					return response.data;
				}
				,function(response) {
					return {error:response.status,desc:response.statusText}
		});
	}
	
	this.getUnits = function (helpdesk_id) {
		var url = "process.php/units/helpdesk/"+helpdesk_id;
		$http.get(url)
			.then (function(response) {
					return response.data;
				}
				, function(response) {
					return {error:response.status,desc:response.statusText}
			});
	}
	
	this.getTutors = function (helpdesk_id) {
		var url = "process.php/tutors/helpdesk/"+helpdesk_id;
		$http.get(url)
			.then (function(response) {
					return response.data;
				}
				, function(response) {
					return {error:response.status,desc:response.statusText}
			});
	}
	
	$scope.makeRequest = function(rname, runit, rdesc, rrequest) {
			var url = "process.php/request/helpdesk/"+helpdesk_id;
			var data = JSON.stringify ({name: rname, unit: runit, desc:rdesc,request:rrequest});
			$http.put(url, data)
				.then(function (response) {
				}, function (response) {
					return {error:response.status,desc:response.statusText}
				});
			};
	
	$scope.deleteRequest = function(request_id) {
			var url = "process.php/request/request_id/"+request_id;
			$http.delete(url)
				.then(function (response) {
					//do nothing
				}, function (response) {
					return {error:response.status,desc:response.statusText}
				});
			};
});


