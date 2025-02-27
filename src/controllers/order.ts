import type { RequestHandler } from 'express';
import createHttpError from 'http-errors';
import OrderModel from '@/models/order';
import { createSesEncrypt, createShaEncrypt } from '@/utils/crypto';

export const getAllOrderList: RequestHandler = async (_req, res, next) => {
    try {
        const result = await OrderModel.find().populate({
            path: 'roomId'
        });

        res.send({
            status: true,
            result
        });
    } catch (error) {
        next(error);
    }
};

export const getUserOrderList: RequestHandler = async (req, res, next) => {
    try {
        const result = await OrderModel.find({
            orderUserId: req.user?._id
        }).populate({
            path: 'roomId'
        });

        res.send({
            status: true,
            result
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderById: RequestHandler = async (req, res, next) => {
    try {
        const result = await OrderModel.findById(req.params.id).populate({
            path: 'roomId'
        });
        if (!result) {
            throw createHttpError(404, '此訂單不存在');
        }

        res.send({
            status: true,
            result
        });
    } catch (error) {
        next(error);
    }
};

export const createOneOrder: RequestHandler = async (req, res, next) => {
    try {
        const { roomId, checkInDate, checkOutDate, peopleNum, userInfo } = req.body;

        const result = await OrderModel.create({
            roomId,
            orderUserId: req.user?._id,
            checkInDate,
            checkOutDate,
            peopleNum,
            userInfo
        });

        await result.populate({
            path: 'roomId'
        });
        const TimeStamp = Math.round(new Date().getTime() / 1000).toString();
        const paymentOrder = {
            ...result.toObject(),
            TimeStamp,
            Amt: parseInt((result.roomId as any).price),
            MerchantOrderNo: TimeStamp,
            ItemDesc: '房間預訂',
            Email: userInfo.email || ''
        };
        // 產生金流串接所需的加解密資訊
        const aesEncrypt = createSesEncrypt(paymentOrder);
        const shaEncrypt = createShaEncrypt(aesEncrypt);
        
        const paymentData = {
            ...paymentOrder,
            aesEncrypt,
            shaEncrypt
        };

        result.paymentInfo = paymentData;
        await result.save();

        res.send({
            status: true,
            result: paymentData
        });
    } catch (error) {
        next(error);
    }
};

export const updateOrderById: RequestHandler = async (req, res, next) => {
    try {
        const { roomId, checkInDate, checkOutDate, peopleNum, userInfo } = req.body;

        const result = await OrderModel.findOneAndUpdate(
            {
                _id: req.params.id
            },
            {
                roomId,
                checkInDate,
                checkOutDate,
                peopleNum,
                userInfo
            },
            {
                new: true,
                runValidators: true
            }
        ).populate({
            path: 'roomId'
        });
        if (!result) {
            throw createHttpError(404, '此訂單不存在');
        }

        res.send({
            status: true,
            result
        });
    } catch (error) {
        next(error);
    }
};

export const deleteOrderByUser: RequestHandler = async (req, res, next) => {
    try {
        const result = await OrderModel.findOneAndUpdate(
            {
                _id: req.params.id,
                orderUserId: req.user?._id
            },
            {
                status: -1
            },
            {
                new: true,
                runValidators: true
            }
        ).populate({
            path: 'roomId'
        });
        if (!result) {
            throw createHttpError(404, '此訂單不存在');
        }

        res.send({
            status: true,
            result
        });
    } catch (error) {
        next(error);
    }
};

export const deleteOrderByAdmin: RequestHandler = async (req, res, next) => {
    try {
        const result = await OrderModel.findOneAndUpdate(
            {
                _id: req.params.id
            },
            {
                status: -1
            },
            {
                new: true,
                runValidators: true
            }
        ).populate({
            path: 'roomId'
        });
        if (!result) {
            throw createHttpError(404, '此訂單不存在');
        }

        res.send({
            status: true,
            result
        });
    } catch (error) {
        next(error);
    }
};
