/* eslint-disable no-console */
class Logger {
  constructor(name, color) {
    console.log = (value) => {
      console.log.call(console, `%c[${name}]:`, `color: ${color};`, value);
    };

    console.info = (value) => {
      console.info.call(console, `%c[${name}]:`, `color: ${color};`, value);
    };

    console.warn = (value) => {
      console.warn.call(console, `%c[${name}]:`, `color: ${color};`, value);
    };

    console.debug = (value) => {
      console.debug.call(console, `%c[${name}]:`, `color: ${color};`, value);
    };

    console.error = (value) => {
      console.error.call(console, `%c[${name}]:`, `color: ${color};`, value);
    };
  }
}

export default Logger;
