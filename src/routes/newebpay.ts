// src/routes/newebpay.ts
import { Router } from 'express'
import * as newebpayController from '../controllers/newebpay'

const router = Router()

// 藍新金流 Notify (後台通知) 路由，其他邏輯請參考前面的 notify 函式
router.post('/notify', newebpayController.notify)

// 藍新金流 Return (導回) 路由
router.post('/return', newebpayController.paymentReturn)

export default router
