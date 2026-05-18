import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const mockSave = vi.fn()
const mockFindOne = vi.fn()

vi.mock('@/models/order', () => ({
  default: { findOne: mockFindOne },
}))

vi.mock('@/utils/crypto', () => ({
  createCloseEncrypt: vi.fn().mockReturnValue('encrypteddata'),
  createQueryCheckValue: vi.fn().mockReturnValue('CHECKVALUE'),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { cancelOrderByUser, getOrderPaymentStatus } = await import('../order')

describe('cancelOrderByUser', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    req = {
      params: { id: '676512ae9519e0b01d74c55a' },
      user: { _id: 'user123' } as any,
    }
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    }
    next = vi.fn()
  })

  it('calls newebpay CreditCard/Close with CloseType=2 and cancels order when paymentType is CREDIT', async () => {
    const mockOrder = {
      paymentInfo: {
        MerchantOrderNo: 'ORDER20240101001',
        Amt: 3000,
        paymentType: 'CREDIT',
      },
      status: 0,
      save: mockSave.mockResolvedValue(undefined),
    }
    mockFindOne.mockResolvedValue(mockOrder)
    mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue({ Status: 'SUCCESS' }) })

    await cancelOrderByUser(req as Request, res as Response, next)

    const fetchCall = mockFetch.mock.calls[0]
    expect(fetchCall[0]).toContain('/API/CreditCard/Close')
    const body: string = fetchCall[1].body
    expect(body).toContain('PostData_=encrypteddata')
    expect(mockOrder.status).toBe(-1)
    expect(mockSave).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('cancels order without calling newebpay when paymentType is VACC', async () => {
    const mockOrder = {
      paymentInfo: {
        MerchantOrderNo: 'ORDER20240101001',
        Amt: 3000,
        paymentType: 'VACC',
      },
      status: 0,
      save: mockSave.mockResolvedValue(undefined),
    }
    mockFindOne.mockResolvedValue(mockOrder)

    await cancelOrderByUser(req as Request, res as Response, next)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockOrder.status).toBe(-1)
    expect(mockSave).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('cancels order without calling newebpay when paymentInfo is null', async () => {
    const mockOrder = {
      paymentInfo: null,
      status: 0,
      save: mockSave.mockResolvedValue(undefined),
    }
    mockFindOne.mockResolvedValue(mockOrder)

    await cancelOrderByUser(req as Request, res as Response, next)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockOrder.status).toBe(-1)
    expect(mockSave).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('returns 400 and does not cancel order when newebpay close fails', async () => {
    const mockOrder = {
      paymentInfo: {
        MerchantOrderNo: 'ORDER20240101001',
        Amt: 3000,
        paymentType: 'CREDIT',
      },
      status: 0,
      save: mockSave,
    }
    mockFindOne.mockResolvedValue(mockOrder)
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ Status: 'FAILURE', Message: '退款失敗' }),
    })

    await cancelOrderByUser(req as Request, res as Response, next)

    expect(mockOrder.status).toBe(0)
    expect(mockSave).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: '退款失敗' })
  })

  it('returns 404 when order is not found', async () => {
    mockFindOne.mockResolvedValue(null)

    await cancelOrderByUser(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: '此訂單不存在' })
  })
})

describe('getOrderPaymentStatus', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    req = {
      params: { id: '676512ae9519e0b01d74c55a' },
      user: { _id: 'user123' } as any,
    }
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    }
    next = vi.fn()
  })

  it('calls newebpay QueryTradeInfo and returns payment status', async () => {
    const mockOrder = {
      paymentInfo: { MerchantOrderNo: 'ORDER20240101001', Amt: 3000 },
    }
    mockFindOne.mockResolvedValue(mockOrder)
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        Status: 'SUCCESS',
        Result: { PaymentType: 'CREDIT', Amt: 3000 },
      }),
    })

    await getOrderPaymentStatus(req as Request, res as Response, next)

    const fetchCall = mockFetch.mock.calls[0]
    expect(fetchCall[0]).toContain('/API/QueryTradeInfo')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ Status: 'SUCCESS' })
    )
  })

  it('returns 400 when newebpay query returns non-SUCCESS status', async () => {
    mockFindOne.mockResolvedValue({
      paymentInfo: { MerchantOrderNo: 'ORDER20240101001', Amt: 3000 },
    })
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ Status: 'FAILURE', Message: '查無此交易' }),
    })

    await getOrderPaymentStatus(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: '查無此交易' })
  })

  it('returns 404 when order is not found', async () => {
    mockFindOne.mockResolvedValue(null)

    await getOrderPaymentStatus(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: '此訂單不存在' })
  })

  it('returns 400 when order has no paymentInfo', async () => {
    mockFindOne.mockResolvedValue({ paymentInfo: null })

    await getOrderPaymentStatus(req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: '此訂單無付款資訊' })
  })
})
