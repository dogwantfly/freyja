// controllers/newebpay.ts
import { Request, Response, NextFunction } from 'express'
import { createSesDecrypt, createShaEncrypt } from '../utils/crypto'
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
    return res.redirect(`${frontendURL}/pay/success`)
  } catch (error) {
    next(error)
  }
}

