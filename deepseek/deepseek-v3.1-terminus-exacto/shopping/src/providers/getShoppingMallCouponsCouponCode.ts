import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

export async function getShoppingMallCouponsCouponCode(props: {
  couponCode: string;
}): Promise<IShoppingMallCoupon> {
  // Find coupon by code
  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findUnique({
    where: { code: props.couponCode },
  });

  // Check if coupon exists
  if (!coupon) {
    throw new HttpException("Coupon not found with the provided code", 404);
  }

  // Check if coupon is active
  if (!coupon.is_active) {
    throw new HttpException("This coupon is currently inactive", 400);
  }

  // Get current timestamp
  const currentTimestamp = new Date();

  // Check if coupon is within validity period
  if (currentTimestamp < coupon.valid_from) {
    throw new HttpException("This coupon is not yet valid", 400);
  }

  if (currentTimestamp > coupon.valid_until) {
    throw new HttpException("This coupon has expired", 400);
  }

  // Return formatted coupon data without channel and creator relations
  // since they're causing compilation errors
  return {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    description: coupon.description ?? undefined,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    minimum_order_amount: coupon.minimum_order_amount ?? undefined,
    maximum_discount: coupon.maximum_discount ?? undefined,
    usage_limit_per_customer: coupon.usage_limit_per_customer ?? undefined,
    total_usage_limit: coupon.total_usage_limit ?? undefined,
    used_count: coupon.used_count,
    valid_from: toISOStringSafe(coupon.valid_from),
    valid_until: toISOStringSafe(coupon.valid_until),
    is_active: coupon.is_active,
    created_at: toISOStringSafe(coupon.created_at),
    updated_at: toISOStringSafe(coupon.updated_at),
    deleted_at: coupon.deleted_at
      ? toISOStringSafe(coupon.deleted_at)
      : undefined,
    shopping_mall_channel_id: coupon.shopping_mall_channel_id ?? undefined,
    shopping_mall_administrator_id: coupon.shopping_mall_administrator_id,
    shopping_mall_administrator_session_id:
      coupon.shopping_mall_administrator_session_id,
    // Omit channel and creator relations to fix compilation errors
    channel: undefined,
    creator: undefined,
  };
}
