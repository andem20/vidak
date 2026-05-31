pub mod test_data;
pub mod test_data_2;

use std::{any::Any, collections::HashMap, error::Error, sync::Arc};

use arrow::{
    array::{Array, RecordBatch},
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
            .map(|x| arrow::datatypes::Date64Type::parse(x).unwrap_or_default())
            .collect::<Vec<i64>>();

        let deaths = test_data
            .iter()
            .skip(2)
            .step_by(header_length)
            .map(|x| i32::from_str_radix(x, 10))
            .map(|r| r.map_err(|e| JsError::new(&e.to_string())))
            .collect::<Result<Vec<i32>, JsError>>()?;

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

        let x_data = arrow::array::Date64Array::from(date);
        let y_data = arrow::array::Int32Array::from(deaths);
        //-----------------------------------
        // let header_length = 16;

        // let test_data = test_data_2::data
        //     .split("\n")
        //     .flat_map(|x| x.split(";").map(|x| x.to_string()).collect::<Vec<String>>())
        //     .collect::<Vec<String>>();

        // let date = test_data
        //     .iter()
        //     .skip(0)
        //     .step_by(header_length)
        //     .map(|x| {
        //         arrow::datatypes::Date64Type::parse_formatted(x, "%d/%m/%Y %H.%M.%S")
        //             .unwrap_or_default()
        //     })
        //     .collect::<Vec<i64>>();

        // let col_1 = test_data
        //     .iter()
        //     .skip(4)
        //     .step_by(header_length)
        //     .map(|x| {
        //         x.parse::<f32>()
        //             .map_err(|e| JsError::new(&format!("msg: {}; {:?}", &e.to_string(), x)))
        //     })
        //     .collect::<Result<Vec<f32>, JsError>>()?;

        // let mut x_metadata = HashMap::new();
        // x_metadata.insert(
        //     "min".to_owned(),
        //     (date.iter().min().unwrap_or(&0)).to_string(),
        // );
        // x_metadata.insert(
        //     "max".to_owned(),
        //     (date.iter().max().unwrap_or(&0)).to_string(),
        // );

        // let mut y_metadata = HashMap::new();
        // y_metadata.insert(
        //     "min".to_owned(),
        //     col_1
        //         .iter()
        //         .min_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Less))
        //         .unwrap_or(&0.0)
        //         .to_string(),
        // );
        // y_metadata.insert(
        //     "max".to_owned(),
        //     col_1
        //         .iter()
        //         .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Less))
        //         .unwrap_or(&0.0)
        //         .to_string(),
        // );

        // let x_data = arrow::array::Date64Array::from(date);
        // let y_data = arrow::array::Float32Array::from(col_1);
        // -------------
        let x_field =
            Field::new("date", x_data.data_type().clone(), false).with_metadata(x_metadata);
        let y_field =
            Field::new("col_1", y_data.data_type().clone(), false).with_metadata(y_metadata);

        let schema = Schema::new(vec![x_field, y_field]);

        let batch = RecordBatch::try_new(
            Arc::new(schema.clone()),
            vec![Arc::new(x_data), Arc::new(y_data)],
        )?;

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
