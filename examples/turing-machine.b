program = {
  "state_0": {
    "1": {
      "write": "B",
      "move": "right",
      "to_state": "state_1"
    }
  },
  "state_1": {
    "1": {
      "write": "1",
      "move": "right",
      "to_state": "state_1"
    },
    "0": {
      "write": "0",
      "move": "right",
      "to_state": "state_2"
    },
    "B": {
      "write": "0",
      "move": "right",
      "to_state": "state_2"
    }
  },
  "state_2": {
    "1": {
      "write": "1",
      "move": "right",
      "to_state": "state_2"
    },
    "B": {
      "write": "1",
      "move": "left",
      "to_state": "state_3"
    }
  },
  "state_3": {
    "0": {
      "write": "0",
      "move": "left",
      "to_state": "state_3"
    },
    "1": {
      "write": "1",
      "move": "left",
      "to_state": "state_3"
    },
    "B": {
      "write": "1",
      "move": "right",
      "to_state": "state_4"
    }
  },
  "state_4": {
    "0": {
      "write": "0",
      "move": "right",
      "to_state": "stop"
    },
    "1": {
      "write": "B",
      "move": "right",
      "to_state": "state_1"
    }
  }
};

tape = {"0": "1", "1": "1", "2": "1"};

caret_position = 0;
current_state = "state_0";

while(current_state != "stop", {()
  log(current_state);

  if(
    defined(tape[caret_position]),
    {()
      value = tape[caret_position];

      result = if(
        defined(program[current_state][value]),
        program[current_state][value],
        program[current_state]["0"]
      );

      tape[caret_position] = result["write"];
    },
    {()
      log(current_state, value, tape);
      result = program[current_state]["B"];
      tape[caret_position] = result["write"];
    }
  );

  if(result["move"] == "right", {() caret_position = caret_position + 1});
  if(result["move"] == "left", {() caret_position = caret_position - 1});

  current_state = result["to_state"];
});

log(tape);
