import { Schema, model, type Document } from 'mongoose';
import validator from 'validator';
import ZipCodeMap, { zipCodeList } from '@/utils/zipcodes';

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    birthday?: Date;
    address?: {
        zipcode: number;
        detail: string;
        county: string;
        city: string;
    };
    verificationToken?: string;
    googleId?: string;
}

const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, 'name 未填寫'],
            validate: {
                validator(value: string) {
                    return validator.isLength(value, { min: 2 });
                },
                message: 'name 至少 2 個字元以上'
            }
        },
        email: {
            type: String,
            required: [true, 'email 未填寫'],
            validate: {
                validator(value: string) {
                    return validator.isEmail(value);
                },
                message: 'Email 格式不正確'
            }
        },
        password: {
            type: String,
            required: false,
            select: false
        },
        phone: {
            type: String,
            required: false
        },
        birthday: {
            type: Date,
            required: false
        },
        address: {
            zipcode: {
                type: Number,
                required: false,
                validate: {
                    validator(value: number) {
                        return value === undefined || zipCodeList.includes(value);
                    },
                    message: 'zipcode 錯誤'
                }
            },
            detail: {
                type: String,
                required: false
            }
        },
        verificationToken: {
            type: String,
            default: '',
            select: false
        },
        googleId: {
            type: String,
            required: false,
            select: false
        }
    },
    {
        versionKey: false,
        timestamps: true,
        toObject: {
            virtuals: true
        }
    }
);

userSchema.virtual('address.county').get(function () {
    return ZipCodeMap.find(value => value.zipcode === this.address?.zipcode)?.county;
});

userSchema.virtual('address.city').get(function () {
    return ZipCodeMap.find(value => value.zipcode === this.address?.zipcode)?.city;
});

export default model('user', userSchema);
