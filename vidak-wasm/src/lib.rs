use std::sync::Arc;

use arrow::{
    array::RecordBatch,
    datatypes::{DataType, Field, Schema},
    ipc::writer::StreamWriter,
};
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub struct Buffer {
    data: Vec<u8>,
}

#[wasm_bindgen]
impl Buffer {
    pub fn new(size: usize) -> Self {
        let data = (0..size)
            .map(|x| (x as f32 / 10.0).sin() * 50.0)
            .collect::<Vec<f32>>();

        let x_data = arrow::array::Float32Array::from(
            (0..size).map(|x| (x as f32) * 2.0).collect::<Vec<f32>>(),
        );
        let y_data = arrow::array::Float32Array::from(data);

        let schema = Schema::new(vec![
            Field::new("x", DataType::Float32, false),
            Field::new("y", DataType::Float32, false),
        ]);

        let batch = RecordBatch::try_new(
            Arc::new(schema.clone()),
            vec![Arc::new(x_data), Arc::new(y_data)],
        )
        .unwrap();

        let mut bytes = Vec::new();

        let mut writer = StreamWriter::try_new(&mut bytes, &batch.schema()).unwrap();
        writer.write(&batch).unwrap();
        writer.finish().unwrap();

        return Buffer { data: bytes };
    }

    pub fn ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }

    pub fn free(&mut self) {
        self.data.clear();
    }
}
