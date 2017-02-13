<?php

//NOTE Ensure that all dates are in yyyy/mm/dd format before entering to database

// get the HTTP method, path and body of the request
$method = $_SERVER['REQUEST_METHOD'];
$request = explode('/', trim($_SERVER['PATH_INFO'],'/'));
$input = json_decode(file_get_contents('php://input'),true);

// connect to the mysql database
// Update he connection string accordingly

//Update from the config.php
require_once('config.php');
$conn = mysqli_connect($host, $user, $password, $database);
mysqli_set_charset($conn,'utf8');

// retrieve the resource asked
$resrc = preg_replace('/[^a-z0-9_]+/i','',array_shift($request));
//check if valid
if($resrc!='sales' && $resrc!='month_sales')
{
	header('X-PHP-Response-Code: 403', true, 403);
	die('Illegal Operation');
}
//extract id if exist with uri
$id=array_shift($request);
//extract data from json input
if (isset ($input))  {
	// escape the columns and values from the input object
	$saleColumns = array('SaleDate','Amount','Paid','Change','Staff_ID');
	$values=array_values($input);


	// build the SET part of the SQL command
	$set = '';
	for ($i=0;$i<count($saleColumns);$i++) {
		$set.=($i>0?',':'').'`'.$saleColumns[$i].'`=';
		$set.=($values[$i]===null?'NULL':''.(is_numeric($values[$i])?$values[$i]:'"'.$values[$i].'"').'');
	}

	//get all items sold
	$items=$input['Items'];
}

if($resrc=='sales')
	{
		//adding a sale
		if($method=='POST' && isset($input))
		{

			$sql="insert into `Sales` set $set";
			$result=mysqli_query($conn,$sql);

			if(!$result)
			{
				header('Content-Type: application/json');
			echo json_encode(array("error"=>"Query Failed","description"=>"Failed to Add Sale to Database"));
				die(mysqli_error($conn));
			}

			//add items to table
			$batchID=0;
			$qty=0;

			foreach($items as $item)
			{
				$batchID=intval($item['batch_id']);
				$qty=intval($item['qty']);
				$sql="insert into `SalesItem` set `Sale_ID`=LAST_INSERT_ID(), `Batch_ID`=$batchID, `QuantitySold`=$qty";
				$result=mysqli_query($conn,$sql);

			if(!$result)
			{
				die(mysqli_error($conn));
			}
			}

			//respond with status of query
			header('Content-Type: application/json');
			echo json_encode(array("success"=>"1"));

		}
		//get all sales data
		if ($method == 'GET' && !$id)
		{
			$query1="SELECT s.Sale_ID, s.SaleDate, s.Amount
		FROM Sales s
		INNER JOIN Staff staff ON s.Staff_ID = staff.Staff_ID
		INNER JOIN SalesItem si ON s.Sale_ID = si.Sale_ID
		INNER JOIN Batch b ON si.Batch_ID = b.Batch_ID
		INNER JOIN Product p ON b.Product_ID = p.Product_ID
		ORDER BY s.Sale_ID";
			//run query
			$result1=mysqli_query($conn,$query1);
			if (!$result1) {
				header('Content-Type: application/json');
			echo json_encode(array("error"=>"Query Failed","description"=>"Failed to get sales fro database"));
			header('X-PHP-Response-Code: 404', true, 404);
			die(mysqli_error($conn));
		}


			//set return header
			header('Content-Type: application/json');
			$json=array();
			//generate json object from result
			while($row=mysqli_fetch_assoc($result1))
			{
				$json[$row['Sale_ID']]['id']=$row['Sale_ID'];
				$json[$row['Sale_ID']]['date']=$row['SaleDate'];
				$json[$row['Sale_ID']]['amount']=$row['Amount'];
			}

			echo json_encode(array_values($json));

		}

		if ($method == 'GET' && $id)
		{
			$query1="SELECT s.Sale_ID, s.SaleDate, s.Amount, staff.Name, si.Batch_ID, si.QuantitySold, p.Description, p.UnitPrice
		FROM Sales s
		INNER JOIN Staff staff ON s.Staff_ID = staff.Staff_ID
		INNER JOIN SalesItem si ON s.Sale_ID = si.Sale_ID
		INNER JOIN Batch b ON si.Batch_ID = b.Batch_ID
		INNER JOIN Product p ON b.Product_ID = p.Product_ID
		WHERE s.Sale_ID=$id";
			//run query
			$result1=mysqli_query($conn,$query1);
			if (!$result1) {
				header('Content-Type: application/json');
			echo json_encode(array("error"=>"Query Failed","description"=>"Failed to get sale fro database"));
			header('X-PHP-Response-Code: 404', true, 404);
			die(mysqli_error($conn));
		}


			//set return header
			header('Content-Type: application/json');
			$json=array();
			//generate json object from result
			while($row=mysqli_fetch_assoc($result1))
			{
				$json[$row['Sale_ID']]['id']=$row['Sale_ID'];
				$json[$row['Sale_ID']]['date']=$row['SaleDate'];
				$json[$row['Sale_ID']]['staff']=$row['Name'];
				$json[$row['Sale_ID']]['items'][]=array(
					'batchID'=>$row['Batch_ID'],
					'description'=>$row['Description'],
					'quantitySold'=>$row['QuantitySold'],
					'unitPrice'=>$row['UnitPrice']
					);
			}

			echo json_encode(array_values($json));

		}
	//updating a sale
	//limitation only can change the items already purchased by customer
		if($method=='PUT' && isset($input) && $id)
		{

			$sql="UPDATE `Sales` set $set WHERE Sale_ID=$id";
			$result=mysqli_query($conn,$sql);

			if(!$result)
			{
				header('Content-Type: application/json');
			echo json_encode(array("error"=>"Query Failed","description"=>"Failed to Update Sale to Database"));
				die(mysqli_error($conn));
			}

			//update items in SalesItem table
			$batchID=0;
			$qty=0;

			foreach($items as $item)
			{
				$batchID=intval($item['batch_id']);
				$qty=intval($item['qty']);
				$sql="UPDATE `SalesItem` set `QuantitySold`=$qty
				WHERE `Sale_ID`=$id AND `Batch_ID`=$batchID";
				$result=mysqli_query($conn,$sql);

			if(!$result)
			{
				die(mysqli_error($conn));
			}
			}

			//respond with status of query
			header('Content-Type: application/json');
			echo json_encode(array("success"=>"1"));

		}
	}


/*MonthlySales Methods*/
else if($resrc='month_sales' && $id=='date')
{
	//get sales between two ranges
	//api call format: /salesapi.php/month_sales/date?start=2016-01-01&end=2017-01-01

	//extract parameters
	parse_str($_SERVER['QUERY_STRING'], $query);

	//check if date format correct
	if(preg_match('/^\d{4}-\d{2}-\d{2}$/',$query['start']) && preg_match('/^\d{4}-\d{2}-\d{2}$/',$query['end']))
	{
		$start=$query['start'];
		$end=$query['end'];
	}
	else
	{
		header('Content-Type: application/json');
			echo json_encode(array("error"=>"Invalid Date","description"=>"Dates not in correct format"));
			header('X-PHP-Response-Code: 404', true, 404);
			die(mysqli_error($conn));
	}

	//set up sql query
	$sql="SELECT s.Sale_ID, s.SaleDate, s.Amount
				FROM Sales s
				WHERE s.SaleDate>='$start' and s.SaleDate<='$end'
				ORDER BY s.SaleDate";
	//run query
	$result=mysqli_query($conn,$sql);
			if (!$result) {
				header('Content-Type: application/json');
			echo json_encode(array("error"=>"Query Failed","description"=>"Failed to get sales from database"));
			header('X-PHP-Response-Code: 404', true, 404);
			die(mysqli_error($conn));
		}
	//set return header
			header('Content-Type: application/json');
			$json=array();
			//generate json object from result
			while($row=mysqli_fetch_assoc($result))
			{
				$json[]=array(
			'id'=>$row['Sale_ID'],
			'date'=>$row['SaleDate'],
			'amount'=>$row['Amount']
			);

			}

			echo json_encode($json);
}


mysqli_close($conn);

?>
