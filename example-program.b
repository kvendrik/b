multiply = {(x, y) x * y};
calc = {(x)
  base = 5;
  multiply(base, x);
};

result = calc(4);
message = concat("Multiplied and doubled the value is", result);

log(message);
