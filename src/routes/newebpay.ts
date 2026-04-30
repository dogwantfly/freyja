// src/routes/newebpay.ts
import { Router } from 'express'
import * as newebpayController from '../controllers/newebpay'

const router = Router()

// 藍新金流通知
router.post('/newebpay_notify', newebpayController.notify)
// 藍新金流回導
router.all('/newebpay_return', newebpayController.paymentReturn)
// 查詢藍新金流交易資訊
router.post('/newebpay_query', newebpayController.queryTradeInfo)
// 關閉藍新金流信用卡授權
router.post('/newebpay_close', newebpayController.creditCardClose)

export default router
