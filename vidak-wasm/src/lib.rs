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
    pub fn new() -> Self {
        let data = (0..1_000_000)
            .map(|x| (x as f32).sin())
            .collect::<Vec<f32>>();

        let arrow_array = arrow::array::Float32Array::from(data);

        let schema = Schema::new(vec![Field::new("values", DataType::Float32, false)]);

        let batch =
            RecordBatch::try_new(Arc::new(schema.clone()), vec![Arc::new(arrow_array)]).unwrap();

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
}
