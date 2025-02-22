import crypto from 'crypto';
const {
  MerchantID,
  HASHKEY,
  HASHIV,
  Version,
  NotifyUrl,
  ReturnUrl,
} = process.env;
const RespondType = 'JSON';
// 字串組合
function genDataChain(order: { 
  TimeStamp: string;
  MerchantOrderNo: string;
  Amt: number;
  ItemDesc: string;
  Email: string;
}): string {
  return `MerchantID=${MerchantID}&TimeStamp=${
    order.TimeStamp
  }&Version=${Version}&RespondType=${RespondType}&MerchantOrderNo=${
    order.MerchantOrderNo
  }&Amt=${order.Amt}&NotifyURL=${encodeURIComponent(
    NotifyUrl || ''
  )}&ReturnURL=${encodeURIComponent(ReturnUrl || '')}&ItemDesc=${encodeURIComponent(
    order.ItemDesc,
  )}&Email=${encodeURIComponent(order.Email)}`;
}
// 對應文件 P17
// MerchantID=MS12345678&TimeStamp=1663040304&Version=2.0&RespondType=Stri
// ng&MerchantOrderNo=Vanespl_ec_1663040304&Amt=30&NotifyURL=https%3A%2F%2
// Fwebhook.site%2Fd4db5ad1-2278-466a-9d66-
// 78585c0dbadb&ReturnURL=&ItemDesc=test
// 對應文件 P17：使用 aes 加密
// $edata1=bin2hex(openssl_encrypt($data1, "AES-256-CBC", $key, OPENSSL_RAW_DATA, $iv));
export const createSesEncrypt = (TradeInfo: {
  TimeStamp: string;
  MerchantOrderNo: string;
  Amt: number;
  ItemDesc: string;
  Email: string;
}): string => {
  if (!HASHKEY || !HASHIV) {
    throw new Error('HASHKEY and HASHIV are required');
  }
  
  const key = Buffer.from(HASHKEY, 'utf8');
  const iv = Buffer.from(HASHIV, 'utf8');
  const encrypt = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = encrypt.update(genDataChain(TradeInfo), 'utf8', 'hex');
  return enc + encrypt.final('hex');
}

// 對應文件 P18：使用 sha256 加密
// $hashs="HashKey=".$key."&".$edata1."&HashIV=".$iv;
export const createShaEncrypt = (aesEncrypt: string): string => {
  if (!HASHKEY || !HASHIV) {
    throw new Error('HASHKEY and HASHIV are required');
  }
  
  const sha = crypto.createHash('sha256');
  const plainText = `HashKey=${HASHKEY}&${aesEncrypt}&HashIV=${HASHIV}`;
  return sha.update(plainText).digest('hex').toUpperCase();
}

// 對應文件 21, 22 頁：將 aes 解密
export const createSesDecrypt = (TradeInfo: string): any => {
  if (!HASHKEY || !HASHIV) {
    throw new Error('HASHKEY and HASHIV are required');
  }
  const decrypt = crypto.createDecipheriv('aes256', HASHKEY, HASHIV);
  decrypt.setAutoPadding(false);
  const text = decrypt.update(TradeInfo, 'hex', 'utf8');
  const plainText = text + decrypt.final('utf8');
  const result = plainText.replace(/[\x00-\x20]+/g, '');
  return JSON.parse(result);
}