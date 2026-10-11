"""
Contains the Models for doTRoute example
"""

import time
import relations

import ipaddress

class Base(relations.Model):
    """
    Base class for doTRoute models
    """

    SOURCE = "dotroute-relations"


def now():
    """
    Time function so we can freeze
    """
    return time.time()


class Person(Base):
    """
    Person model
    """

    CHUNK = 2

    id = int
    name = str
    status = ["active", "inactive"]


class Stuff(Base):
    """
    Stuff model
    """

    ID = None
    person_id = int
    name = str
    items = list

relations.OneToMany(Person, Stuff)


class Thing(Base):
    """
    Thing model
    """

    id = int
    person_id = int
    name = str
    items = dict

relations.OneToMany(Person, Thing)


class Meta(Base):
    """
    Meta model, with fields that extract from and inject into others
    """

    id = int
    name = str
    flag = bool
    spend = float
    people = set
    stuff = list
    things = dict, {"extract": "for__0___1"}
    push = str, {"inject": "stuff__-1__relations.io___1"}


def subnet_attr(values, value):
    """
    Spreads a network out into the values stored for it
    """

    values["address"] = str(value)
    min_ip = value[0]
    max_ip = value[-1]
    values["min_address"] = str(min_ip)
    values["min_value"] = int(min_ip)
    values["max_address"] = str(max_ip)
    values["max_value"] = int(max_ip)

class Net(Base):
    """
    Net model, with fields that are IP addresses and networks
    """

    id = int
    proto = {"UDP", "TCP"}
    ip = ipaddress.IPv4Address, {
        "attr": {"compressed": "address", "__int__": "value"},
        "init": "address",
        "titles": "address",
        "extract": {"address": str, "value": int}
    }
    subnet = ipaddress.IPv4Network, {
        "attr": subnet_attr,
        "init": "address",
        "titles": "address"
    }

    TITLES = "ip__address"
    INDEX = "ip__value"
