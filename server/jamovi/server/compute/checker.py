
from ast import NodeVisitor
from ast import walk
from inspect import signature
from inspect import Parameter
from math import isnan

from .functions import ColumnFunctions
from .functions import RowFunctions


class Checker(NodeVisitor):

    LEGAL_NODES = [ 'Num', 'Str', 'Name', 'Load', 'UnaryOp', 'UAdd', 'USub',
                    'BinOp', 'Add', 'Sub', 'Mult', 'Div', 'Mod', 'Pow', 'Call' ]

    @staticmethod
    def check(column, node):
        for child in walk(node):
            if child.__class__.__name__ not in Checker.LEGAL_NODES:
                raise SyntaxError('Formula contains illegal node')

        checker = Checker(column)
        checker.visit(node)  # throws if problem

    def __init__(self, column):
        NodeVisitor.__init__(self)
        self._column = column
        self._dataset = column._parent

    def visit_Call(self, node):

        name = node.func.id

        min_args = 0
        max_args = 0

        if hasattr(ColumnFunctions, name):
            func = getattr(ColumnFunctions, name)
            skip_first = False
        elif hasattr(RowFunctions, name):
            func = getattr(RowFunctions, name)
            skip_first = True  # the first argument to a row function is index
        else:
            raise NameError('Function {}() does not exist'.format(name))

        sig = signature(func)

        for arg_name in sig.parameters:
            if skip_first:
                skip_first = False
                continue

            arg = sig.parameters[arg_name]
            if arg.kind is Parameter.POSITIONAL_OR_KEYWORD:
                max_args += 1
                if arg.default is Parameter.empty:
                    min_args += 1
            elif arg.kind is Parameter.VAR_POSITIONAL:
                max_args = float('nan')
            else:
                raise RuntimeError('Bad function definition')

        if len(node.args) > max_args or len(node.args) < min_args:
            if max_args == min_args:
                raise TypeError('Function {}() takes {} argument(s)'.format(name, min_args))
            elif isnan(max_args):
                raise TypeError('Function {}() requires atleast {} argument(s)'.format(name, min_args))
            else:
                raise TypeError('Function {}() requires between {} and {} arguments'.format(name, min_args, max_args))

        for arg in node.args:
            self.visit(arg)
        for arg in node.keywords:
            self.visit(arg)

    def visit_Name(self, node):
        depcy_name = node.id

        if self._column.name == depcy_name:
            raise RecursionError()
        try:
            depcy = self._dataset[depcy_name]
            depcies = depcy.dependencies

            depcies_names = map(lambda x: x.name, depcies)
            if self._column.name in depcies_names:
                raise RecursionError()

        except KeyError:
            raise NameError("Column '{}' does not exist in the dataset".format(depcy_name))
