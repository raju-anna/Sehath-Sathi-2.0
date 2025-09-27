// fileName: patient.routes.js
import { Router } from 'express'; 
import { authorize } from '../middleware/auth.middleware.js'; 
import { 
    addPatient, 
    getPatientsForUser, 
    updatePatient, 
    deletePatient 
} from '../controllers/patient.controller.js'; 

const router = Router(); 

router.route('/').post(authorize, addPatient);
router.route('/').get(authorize, getPatientsForUser); 
router.route('/:id').put(authorize, updatePatient); 
router.route('/:id').delete(authorize, deletePatient);

export default router;