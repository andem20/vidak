use arrow::compute::kernels::cast_utils::Parser;
use vidak_wasm::test_data_2;

fn main() {
    let date = arrow::datatypes::Date64Type::parse("2026-08-04 10:00:01");
    println!("{:?}", date);
}
