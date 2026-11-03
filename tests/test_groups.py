import unittest
from test_api import api
from svitlo_test.const import selected_groups


class GroupTests(unittest.TestCase):
    def test_existing_group_and_options_survive(self):
        self.assertEqual(selected_groups({"group": "3.1"}), ["3.1"])
        self.assertEqual(selected_groups({"group": "3.1"}, {"group": "4.2"}), ["4.2"])

    def test_multiple_groups_override_legacy(self):
        self.assertEqual(selected_groups({"group": "3.1"}, {"groups": ["3.1", "4.2", "3.1"]}), ["3.1", "4.2"])
        self.assertEqual(selected_groups({"groups": ["1.1", "2.1"]}), ["1.1", "2.1"])


if __name__ == '__main__':
    unittest.main()
