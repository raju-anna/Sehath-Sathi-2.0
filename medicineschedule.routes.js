// fileName: medicineschedule.routes.js
import { Router } from 'express'; 
import { authorize } from '../middleware/auth.middleware.js'; 
import { 
    assignMedicationToSchedule, 
    getMedicationSchedulesForPatient, 
    deleteMedicationSchedule 
} from '../controllers/medicineschedule.controller.js'; 

const router = Router(); 

// POST: /api/v1/med-schedules (Create a new assignment)
router.route('/').post(authorize, assignMedicationToSchedule);
// GET: /api/v1/med-schedules/:patientId (Fetch all assignments for a patient)
router.route('/:patientId').get(authorize, getMedicationSchedulesForPatient);
// DELETE: /api/v1/med-schedules/:medScheduleId (Delete an assignment link)
router.route('/:medScheduleId').delete(authorize, deleteMedicationSchedule);

export default router;