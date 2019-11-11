// usage in application
var INCREASE_VALUE_BY = 'INCREASE_VALUE_BY';
var SET_VALUE = 'SET_VALUE';
var RESET = 'RESET';

registerAction(INCREASE_VALUE_BY, (modelPath, delta) => setModel(modelPath, (1 * getValue(modelPath) | 0) + delta));
registerAction(SET_VALUE, (modelPath, value) => setModel(modelPath, value));
registerAction(RESET, () => setModel('', {} ));
