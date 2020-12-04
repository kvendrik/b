multiply = {(x, y) x * y};
calc = {(x)
  doubled = multiply(x, 2);
  4 * doubled
};

result = calc(5);
message = concat("The result is", 40);

log(message);
