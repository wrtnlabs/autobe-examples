import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCouponsCouponCode(props: {
  customer: CustomerPayload;
  couponCode: string;
}): Promise<IShoppingMallCoupon> {
  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findUnique({
    where: { code: props.couponCode },
  });
  if (coupon === null || coupon.deleted_at !== null) {
    throw new HttpException("Coupon not found", 404);
  }
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    discount_value: coupon.discount_value,
    start_date: toISOStringSafe(coupon.start_date),
    end_date: toISOStringSafe(coupon.end_date),
    created_at: toISOStringSafe(coupon.created_at),
    updated_at: toISOStringSafe(coupon.updated_at),
    deleted_at:
      coupon.deleted_at === null
        ? undefined
        : toISOStringSafe(coupon.deleted_at),
  };
}
