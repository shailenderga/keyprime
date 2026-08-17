import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function test() {
    try {
        const data = new FormData();
        data.append('customer_id', '1');
        data.append('software_version', '1.0');
        data.append('description', 'test');
        // Let's not attach files to see if it fails
        const res = await axios.post('http://localhost:5000/api/tickets', data, {
            headers: data.getHeaders()
        });
        console.log('Success:', res.data);
    } catch (err) {
        if (err.response) {
            console.log('Status:', err.response.status);
            console.log('Data:', err.response.data);
        } else {
            console.log('Error:', err.message);
        }
    }
}
test();
