import mysql from 'mysql';

// MySQL Config
var con = mysql.createConnection({ 
    user: "assignment_2",
    password: "1310192448#Vic", 
    database: "assignment_2"
});

// Connect to MySQL
con.connect(function(err) {
    if (err) throw err;
    console.log("MySQL Connected!");
});

// Make the connection available to other modules via export/import
export default con;