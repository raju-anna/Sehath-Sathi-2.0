// Core imports
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Utility imports
import { ApiError } from "./utilities/ApiError.js";
import { ApiResponse } from "./utilities/ApiResponse.js";

// Routers
import userRouter from "./routes/user.routes.js";
import patientRouter from "./routes/patient.routes.js";
import medicineRouter from "./routes/medicine.routes.js";
import scheduleRouter from "./routes/schedule.routes.js";
import medScheduleRouter from "./routes/medicineschedule.routes.js";

// Auth middleware (for route protection)
import { authorize } from "./middleware/auth.middleware.js";

// Load environment variables
dotenv.config({ path: "../.env" });

const app = express();

// --- MIDDLEWARE ---
app.use(cors({
	origin: process.env.CORS_ORIGIN || "*",
	credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ROUTES DECLARATION ---
const API_VERSION = "/api/v1";

app.use(`${API_VERSION}/users`, userRouter);
app.use(`${API_VERSION}/patients`, patientRouter);
app.use(`${API_VERSION}/medicines`, medicineRouter);
app.use(`${API_VERSION}/schedules`, scheduleRouter);
app.use(`${API_VERSION}/med-schedules`, medScheduleRouter);

// --- ERROR HANDLING ---
// 404 handler
app.use((req, res, next) => {
	next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// Global error handler
app.use((err, req, res, next) => {
	if (err instanceof ApiError) {
		return res.status(err.statusCode).json({
			success: false,
			message: err.message,
			errors: err.errors || [],
			data: null
		});
	}
	// Fallback for unhandled errors
	return res.status(500).json({
		success: false,
		message: err.message || "Internal Server Error",
		errors: [],
		data: null
	});
});

export default app;