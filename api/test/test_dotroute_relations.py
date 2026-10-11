import ipaddress
import unittest
import unittest.mock

import dotroute_relations


class TestNow(unittest.TestCase):

    @unittest.mock.patch("time.time")
    def test_now(self, mock_time):

        mock_time.return_value = 1234.5

        self.assertEqual(dotroute_relations.now(), 1234.5)


class TestSubnetAttr(unittest.TestCase):

    def test_subnet_attr(self):

        values = {}

        dotroute_relations.subnet_attr(values, ipaddress.IPv4Network("10.0.0.0/30"))

        self.assertEqual(values, {
            "address": "10.0.0.0/30",
            "min_address": "10.0.0.0",
            "min_value": 167772160,
            "max_address": "10.0.0.3",
            "max_value": 167772163
        })
