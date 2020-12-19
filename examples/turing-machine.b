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
  "state_3": {
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

tape = {"0": "1", "1": "1", "2": "2"};

caret_position = 0;
current_state = "state_0";

while(current_state != "stop", {()
  value = tape[caret_position];

  log(current_state);
  log(program["state_0"]["1"]);

  result = if(
    defined(program[current_state][value]),
    {() program[current_state][value]},
    {() program[current_state]["B"]}
  );

  tape[caretPosition] = result["write"];

  if(result["move"] == "right", {() caretPosition = caretPosition + 1});
  if(result["move"] == "left", {() caretPosition = caretPosition - 1});

  currentState = result["to_state"];
});
