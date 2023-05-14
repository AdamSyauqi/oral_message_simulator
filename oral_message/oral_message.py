import random
import json


class Node:

    def __init__(self, id, is_traitor=False, is_commander=False):
        self.id = id
        self.is_traitor = is_traitor
        self.is_commander = is_commander
        
        self.orders = []
        self.prev_orders = []
        self.curr_orders = []

        self.logs = []
        self.conclusion = "RETREAT"

    def send(self, target, order, round):
        msg = f"{self.id},{order}"
        if self.is_traitor and round == 0:
            msg = msg.replace(order[-1], "R" if order[-1] == "A" else "A")

        self.write_log(f"Sending {msg} to Node {target.id}")
        target.receive(msg)

    def cmd_send(self, target, order):
        msg = f"{self.id},{order}"
        if self.is_traitor:
            msg = msg.replace(order, "R" if random.choice([0,1]) == 0 else "A")
        
        self.write_log(f"Sending {msg} to Node {target.id}")
        target.receive(msg)

    def receive(self, msg):
        self.orders.append(msg)
        self.curr_orders.append(msg)
        self.write_log(f"Received {msg}")

    def flush_orders(self):
        self.prev_orders.extend(self.curr_orders)
        self.curr_orders = []

    def write_log(self, msg):
        self.logs.append(f"[Node {self.id}] {msg}")

    def to_json(self):
        return {
            "id": self.id,
            "is_traitor": self.is_traitor,
            "is_commander": self.is_commander,
            "conclusion": self.conclusion,
            "logs": self.logs
        }



def initialize(is_traitor_status):
    nodes = []
    for i, status in enumerate(is_traitor_status):
        nodes.append(Node(i, status, i == 0))
    return nodes

def om(is_traitor_status, initial_order):
    nodes = initialize(is_traitor_status)
    m = sum(is_traitor_status)

    # Initial order from Commander
    commander = nodes[0]
    for node in nodes[1:]:
        commander.send(node, initial_order, 0)
        node.flush_orders()    

    # Do m rounds
    for round in range(m):
        for sender in nodes[1:]:

            # Rebroadcast orders from previous round
            for order in sender.prev_orders:
                for target in nodes[1:]:

                     # Skip if target is self or already received current order
                    if target == sender or f"{target.id}" in order:
                        continue

                    sender.send(target, order, round)
        
        for node in nodes:
            node.flush_orders()
    
    # Conclude Actions
    for node in nodes[1:]:
        attack = 0
        retreat = 0
        for order in node.orders:
            if order[-1] == "A":
                attack += 1
            else:
                retreat += 1

        conclusion = "ATTACK" if attack > retreat else "RETREAT"
        if node.is_traitor:
            conclusion = "is a Byzantine Node"
        node.conclusion = conclusion

        node.write_log(f"Received {attack} ATTACK and {retreat} RETREAT")
        node.write_log(f"{conclusion}")
    
    if commander.is_traitor:
        commander.conclusion = "is a Byzantine Node"
    else:
        commander.conclusion = "ATTACK" if initial_order == "A" else "RETREAT"
    commander.write_log(f"{commander.conclusion}")

    return nodes


def test(test_status=None, print_logs=False):
    initial = "A"

    status_4_1 = [False, False, False, True]
    status_4_1c = [True, False, False, False]
    status_4_2 = [False, False, True, True]
    status_6_2 = [False, False, False, True, False, False, True]
    status_4_0 = [False, False, False, False]

    if test_status is not None:
        testing_statuses = [test_status]
    else:
        testing_statuses = [status_4_1, status_4_2, status_6_2, status_4_1c, status_4_0]

    print("==========================================\n")
    for status in testing_statuses:
        nodes = om(status, initial)

        attack, retreat, byz = 0, 0, 0
        for node in nodes:
            if node.conclusion == "ATTACK":
                attack += 1
            elif node.conclusion == "RETREAT":
                retreat += 1
            else:
                byz += 1

            if print_logs:
                print(f"Node {node.id} | {node.conclusion}")
                for log in node.logs:
                    print(log)
                print("\n")

        consensus = "Not reached"
        if attack > retreat:
            consensus = "ATTACK"
        elif retreat > attack:
            consensus = "RETREAT"

        print(f"Initial Order: {initial}")
        print(f"Number of Nodes: {len(nodes)} | Number of Traitors: {sum(status)}")
        print(f"Traitor commander: {status[0]}")

        print("\nResult:")
        print(f"Attack: {attack} | Retreat: {retreat} | Byzantine: {byz}")
        print(f"Consensus = {consensus}")

        print("\n==========================================\n")

def serialize(nodes):
    serialized = {}
    for node in nodes:
        serialized[node.id] = node.to_json()
    return json.dumps(serialized, indent=4)


def serialized_om(is_traitor_status, initial_order):
    nodes = om(is_traitor_status, initial_order)
    return serialize(nodes)


if __name__ == "__main__":
    nodes = om([False, False, False, True], "A")
    
    serialized = serialize(nodes)
    print(serialized)