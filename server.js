const express = require('express');
const cors = require('cors');
const Routes = require('./routes/index.route');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: '*' }));

app.use('/api', Routes);

const PORT = process.env.PORT || 4002;

app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
