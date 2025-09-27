// fileName: schedule.routes.js
import { Router } from 'express'; 
import { authorize } from '../middleware/auth.middleware.js'; 
import { 
    createScheduleTemplate, 
    getSchedulesForUser, 
    updateScheduleTemplate, 
    deleteScheduleTemplate 
} from '../controllers/schedule.controller.js'; 

const router = Router(); 

router.route('/').post(authorize, createScheduleTemplate);
router.route('/').get(authorize, getSchedulesForUser);
router.route('/:scheduleId').put(authorize, updateScheduleTemplate);
router.route('/:scheduleId').delete(authorize, deleteScheduleTemplate);

export default router;