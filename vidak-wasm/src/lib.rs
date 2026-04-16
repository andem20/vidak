use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub struct Buffer {
    data: Vec<u8>,
}

#[wasm_bindgen]
impl Buffer {
    pub fn new() -> Self {
        return Buffer { data: vec![2; 48] };
    }

    pub fn ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }
}
