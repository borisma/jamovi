//
// Copyright (C) 2016 Jonathon Love
//

#ifndef DATASETW_H
#define DATASETW_H

#include <string>

#include "dataset.h"
#include "memorymapw.h"
#include "columnw.h"

class ColumnW;

class DataSetW : public DataSet
{
public:

    static DataSetW *create(MemoryMapW *mm);
    static DataSetW *retrieve(MemoryMapW *mm);

    ColumnW appendColumn(const char *name, const char *importName);
    ColumnW insertColumn(int index, const char *name, const char *importName);
    void appendRows(int n);
    void insertRows(int rowStart, int rowEnd);
    void deleteRows(int rowStart, int rowEnd);
    void deleteColumns(int rowStart, int rowEnd);
    void setRowCount(size_t count);

    ColumnW operator[](int index);
    ColumnW operator[](const char *name);
    ColumnW getColumnById(int id);

    void setEdited(bool edited);
    bool isEdited() const;

    void setBlank(bool blank);
    bool isBlank() const;

protected:

    DataSetW(MemoryMapW *memoryMap);
    void initColumn(int index);

private:

    MemoryMapW *_mm;
    bool _edited;
    bool _blank;
};

#endif // DATASETW_H
