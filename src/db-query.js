import pg from 'pg';

const client = new pg.Client({
  user: 'tiqvykmp',
  host: 'kandula.db.elephantsql.com',
  database: 'tiqvykmp',
  password: 'ERi1Qp94pXSSzztg4EzXPEOak4FO0sN7',
  port: 5432,
});

const connectDbServer = async () => {
  try {
    await client.connect();
    console.log('Connection to server is successfully run.');
  } catch (error) {
    return console.error('Could not connect to postgres with the', error);
  }
};

const closeDbConnection = async () => {
  client.end();
  console.log('Database server connection was closed.');
};

const createTable = async (queryText) => {
  try {
    await client.query(queryText);
    console.log('New table was successfully created.');
  } catch (error) {
    return console.error('Error table creation with the', error);
  }
};

const insertData = async (queryText, values) => {
  try {
    const response = await client.query(queryText, values);
    console.log(response.rowCount, 'new line was successfully inserted.');
  } catch (error) {
    return console.error('Error data inserting with the', error);
  }
};

const readData = async (queryText) => {
  try {
    const data = await client.query(queryText);
    return data;
  } catch (error) {
    return console.error('Error data reading with the', error);
  }
};

export default {
  connectDbServer,
  closeDbConnection,
  createTable,
  insertData,
  readData,
};
