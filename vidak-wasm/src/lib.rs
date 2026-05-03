pub mod test_data;

use std::{collections::HashMap, sync::Arc};

use arrow::{
    array::RecordBatch,
    compute::kernels::cast_utils::Parser,
    datatypes::{DataType, Field, Schema},
    ipc::writer::StreamWriter,
};
use wasm_bindgen::{JsError, prelude::wasm_bindgen};

#[wasm_bindgen]
pub struct Buffer {
    data: Vec<u8>,
}

#[wasm_bindgen]
impl Buffer {
    pub fn new(size: usize) -> Result<Self, JsError> {
        // Date,Confirmed,Deaths,Recovered,Active,New cases,New deaths,New recovered,Deaths / 100 Cases,Recovered / 100 Cases,Deaths / 100 Recovered,No. of countries
        let test_data = test_data::data
            .split("\n")
            .flat_map(|x| x.split(",").map(|x| x.to_string()).collect::<Vec<String>>())
            .collect::<Vec<String>>();

        let header_length = 12;

        let date = test_data
            .iter()
            .skip(0)
            .step_by(header_length)
            .map(|x| {
                arrow::datatypes::Date32Type::parse_formatted(x, "%Y-%m-%d").unwrap_or_default()
            })
            .collect::<Vec<i32>>();

        let deaths = test_data
            .iter()
            .skip(2)
            .step_by(header_length)
            .map(|x| i32::from_str_radix(x, 10))
            .map(|r| r.map_err(|e| JsError::new(&e.to_string())))
            .collect::<Result<Vec<i32>, JsError>>()?;

        // let data = (0..size)
        //     .map(|x| (x as f32 / 10.0).sin() * 50.0)
        //     .collect::<Vec<f32>>();

        // let x_data = arrow::array::Float32Array::from(
        //     (0..size).map(|x| (x as f32) * 2.0).collect::<Vec<f32>>(),
        // );
        // let y_data = arrow::array::Float32Array::from(data);

        // Todo: this could be generalized. Statistics?
        let mut x_metadata = HashMap::new();
        x_metadata.insert(
            "min".to_owned(),
            (date.iter().min().unwrap_or(&0)).to_string(),
        );
        x_metadata.insert(
            "max".to_owned(),
            (date.iter().max().unwrap_or(&0)).to_string(),
        );

        let mut y_metadata = HashMap::new();
        y_metadata.insert(
            "min".to_owned(),
            deaths.iter().min().unwrap_or(&0).to_string(),
        );
        y_metadata.insert(
            "max".to_owned(),
            deaths.iter().max().unwrap_or(&0).to_string(),
        );

        let x_data = arrow::array::Date32Array::from(date);
        let y_data = arrow::array::Int32Array::from(deaths);

        let x_field = Field::new("date", DataType::Date32, false).with_metadata(x_metadata);
        let y_field = Field::new("deaths", DataType::Int32, false).with_metadata(y_metadata);

        let schema = Schema::new(vec![x_field, y_field]);

        let batch = RecordBatch::try_new(
            Arc::new(schema.clone()),
            vec![Arc::new(x_data), Arc::new(y_data)],
        )
        .unwrap();

        let mut bytes = Vec::new();

        let mut writer = StreamWriter::try_new(&mut bytes, &batch.schema())?;
        writer.write(&batch)?;
        writer.finish()?;

        return Ok(Buffer { data: bytes });
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
