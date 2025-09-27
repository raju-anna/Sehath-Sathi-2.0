// fileName: user.routes.js
import { Router } from "express";
import { authorize } from "../middleware/auth.middleware.js";
import { 
    updateOrCreateUser, 
    getUser, 
    updateAccountDetails 
} from "../controllers/user.controller.js";

const router = Router()

// Sync the Auth0 user with the DB on successful login/callback
router.route("/sync").post(authorize, updateOrCreateUser);

// Get the current logged-in user's details
router.route("/me").get(authorize, getUser);

// Update the current logged-in user's details (phone number, name)
router.route("/me").put(authorize, updateAccountDetails);

export default router;