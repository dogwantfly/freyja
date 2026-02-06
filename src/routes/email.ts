import { Router } from 'express';
import * as emailController from '@/controllers/email';
const router = Router();

router.post('/send',  emailController.sendEmail);

export default router;