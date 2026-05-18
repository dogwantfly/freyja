// controllers/newebpay.ts
import { Request, Response, NextFunction } from 'express'
import { createSesDecrypt, createShaEncrypt, createQueryCheckValue, createCloseEncrypt } from '../utils/crypto'
import OrderModel from '@/models/order';


export const notify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('req.body notify data', req.body)
    const response = req.body
    console.log('response:', response)

    // 解密交易內容
    const data = createSesDecrypt(response.TradeInfo)
    console.log('data:', data)

    // 從解密結果取得 MerchantOrderNo
    const merchantOrderNo = data?.Result?.MerchantOrderNo
    if (!merchantOrderNo) {
      console.log('未取得有效的 MerchantOrderNo')
      return res.end()
    }

    // 從資料庫查詢對應訂單（假設 paymentInfo.MerchantOrderNo 為存放欄位）
    const order = await OrderModel.findOne({ 'paymentInfo.MerchantOrderNo': merchantOrderNo })
    if (!order) {
      console.log('找不到對應的訂單')
      return res.end()
    }
    console.log('order:', order)


    // 使用 HASH 再次 SHA 加密字串，確保比對一致
    const thisShaEncrypt = createShaEncrypt(response.TradeInfo)
    // 請改成 !== 做正確比對
    if (thisShaEncrypt !== response.TradeSha) {
      console.log('付款失敗：TradeSha 不一致')
      return res.end()
    }

    order.isPaid = true;
    if (data?.Result?.PaymentType) {
      order.paymentInfo = {
        ...order.paymentInfo,
        PaymentType: data?.Result?.PaymentType,
      } as any
      order.markModified('paymentInfo');
    }
    await order.save()

    console.log('付款完成，訂單：', order)

    // 如果偵測到請求來源為瀏覽器（例如 user-agent 包含 "Mozilla"），則重導到 /newebpay_return
    if (req.headers['user-agent'] && req.headers['user-agent'].includes('Mozilla')) {
      return res.redirect('/newebpay_return')
    }

    return res.end()
  } catch (error) {
    next(error)
  }
}


/**
 * 查詢藍新金流交易資訊 (QueryTradeInfo)
 * 以 MerchantOrderNo + Amt 建立 CheckValue 後呼叫藍新 API，回傳交易狀態
 */
export const queryTradeInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { MerchantOrderNo, Amt } = req.body
    if (!MerchantOrderNo || Amt === undefined) {
      return res.status(400).json({ error: 'MerchantOrderNo and Amt are required' })
    }

    const timeStamp = Math.floor(Date.now() / 1000).toString()
    const checkValue = createQueryCheckValue({ Amt: Number(Amt), MerchantOrderNo })

    const params = new URLSearchParams({
      MerchantID: process.env.MerchantID || '',
      Version: '1.3',
      RespondType: 'JSON',
      TimeStamp: timeStamp,
      MerchantOrderNo,
      Amt: String(Amt),
      Gateway: '',
      CheckValue: checkValue,
    })

    const apiUrl = `${process.env.NEWEBPAY_API_URL || 'https://ccore.newebpay.com'}/API/QueryTradeInfo`
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const result = await response.json() as any
    if (result.Status !== 'SUCCESS') {
      return res.status(400).json({ error: result.Message || 'Query failed' })
    }

    return res.json(result)
  } catch (error) {
    return next(error)
  }
}

/**
 * 關閉藍新金流信用卡授權 (CreditCard/Close)
 * AES 加密關閉參數後呼叫藍新 API
 */
export const creditCardClose = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { MerchantOrderNo, Amt, CloseType, IndexType } = req.body
    if (!MerchantOrderNo || Amt === undefined || CloseType === undefined || IndexType === undefined) {
      return res.status(400).json({ error: 'MerchantOrderNo, Amt, CloseType and IndexType are required' })
    }

    const postData = createCloseEncrypt({
      MerchantOrderNo,
      Amt: Number(Amt),
      IndexType: Number(IndexType),
      CloseType: Number(CloseType),
    })

    const params = new URLSearchParams({
      MerchantID: process.env.MerchantID || '',
      PostData_: postData,
    })

    const apiUrl = `${process.env.NEWEBPAY_API_URL || 'https://ccore.newebpay.com'}/API/CreditCard/Close`
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const result = await response.json() as any
    if (result.Status !== 'SUCCESS') {
      return res.status(400).json({ error: result.Message || 'Close failed' })
    }

    return res.json(result)
  } catch (error) {
    return next(error)
  }
}

/**
 * 處理藍新金流導回 (Return) 請求
 * 直接將使用者導向 Nuxt3 前端的付款成功頁面 (/pay/success)
 */
export const paymentReturn = (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('req.body return data', req.body)
    // 這裡可先進行必要的解密或驗證邏輯，
    // 但如果僅用於顯示付款成功畫面，
    // 則直接重導到 Nuxt3 前端頁面即可
    const frontendURL = process.env.FRONTEND_URL || 'https://nuxt3-hotel-website.onrender.com'
    console.log('frontendURL', `${frontendURL}/pay/success`)
    return res.redirect(`${frontendURL}/pay/success`)
  } catch (error) {
    return next(error)
  }
}

