import { Request, Response, NextFunction } from 'express';
import validator from 'validator';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export const sendEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { to, subject, text } = req.body;
        if (!to || !subject || !text) {
            return res.status(400).json({ message: '缺少必要欄位' });
        }

        if (!validator.isEmail(to)) {
            return res.status(400).json({ message: '無效的 Email 地址' });
        }

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_AUTH_CLIENT_ID,
            process.env.GOOGLE_AUTH_CLIENT_SECRET,
            process.env.GOOGLE_AUTH_REDIRECT_URI,
        );

        oAuth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_AUTH_REFRESH_TOKEN,
        });

        const accessToken = await oAuth2Client.getAccessToken();

        // 發送 SMTP 請求至 Gmail 伺服器
        const transporter = nodemailer.createTransport<SMTPTransport.Options>({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAILER_USER,
                clientId: process.env.GOOGLE_AUTH_CLIENT_ID,
                clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET,
                refreshToken: process.env.GOOGLE_AUTH_REFRESH_TOKEN,
                accessToken: accessToken,
            },
        } as SMTPTransport.Options);

        const mailOptions = {
            from: process.env.EMAILER_USER,
            to,
            subject,
            text,
        };

        await transporter.sendMail(mailOptions);

        return res.send({
            status: true,
            message: 'Email sent successfully'
        });
    } catch (error) {
        return next(error);
    }
};