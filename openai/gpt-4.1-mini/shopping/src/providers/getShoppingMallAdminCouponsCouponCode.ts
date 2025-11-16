import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminCouponsCouponCode(props: {
  admin: AdminPayload;
  couponCode: string;
}): Promise<IShoppingMallCoupon> {
  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findUnique({
    where: { code: props.couponCode },
  });

  if (!coupon) {
    throw new HttpException(
      `Coupon with code ${props.couponCode} not found`,
      404,
    );
  }

  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description ?? "",
    discount_type: typia.assert<"fixed" | "percentage">(coupon.discount_type),
    discount_value: coupon.discount_value,
    minimum_order_amount: coupon.minimum_order_amount ?? null,
    maximum_discount_amount: coupon.maximum_discount_amount ?? null,
    start_at: toISOStringSafe(coupon.start_at),
    end_at: toISOStringSafe(coupon.end_at),
    usage_limit: coupon.usage_limit ?? null,
    per_customer_limit: null,
    status: coupon.status,
    created_at: toISOStringSafe(coupon.created_at),
    updated_at: toISOStringSafe(coupon.updated_at),
    deleted_at: coupon.deleted_at ? toISOStringSafe(coupon.deleted_at) : null,
  };
}
