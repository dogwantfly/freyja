// src/routes/newebpay.ts
import { Router } from 'express'
import * as newebpayController from '../controllers/newebpay'

const router = Router()

// 藍新金流通知
router.post('/newebpay_notify', newebpayController.notify)
// 藍新金流回導
router.post('/newebpay_return', newebpayController.paymentReturn)

export default router
