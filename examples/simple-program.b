iteration = 0;

while(iteration < 100, {()
  iteration = iteration + 1;

  if(iteration == 50, {() log("Halfway!")});

  message = concat("Currently at: ", iteration);
  log(message);
});
