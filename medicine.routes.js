// fileName: medicine.routes.js
import { Router } from 'express';
import { authorize } from '../middleware/auth.middleware.js';
import { 
    addMedicine, 
    getMedicationsForPatient, 
    updateMedicine, 
    deleteMedicine 
} from '../controllers/medicine.controller.js';

const router = Router();

// POST: /api/v1/medicines/:patientId (Add a new medication for a specific patient)
router.route('/:patientId').post(authorize, addMedicine); 
// GET: /api/v1/medicines/:patientId (Get all medications for a specific patient)
router.route('/:patientId').get(authorize, getMedicationsForPatient);
// PUT: /api/v1/medicines/item/:medicationId (Update a specific medication)
router.route('/item/:medicationId').put(authorize, updateMedicine); 
// DELETE: /api/v1/medicines/item/:medicationId (Delete a specific medication)
router.route('/item/:medicationId').delete(authorize, deleteMedicine);

export default router;