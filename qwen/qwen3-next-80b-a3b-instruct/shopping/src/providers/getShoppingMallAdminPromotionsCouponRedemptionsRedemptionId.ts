import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponRedemption";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminPromotionsCouponRedemptionsRedemptionId(props: {
  admin: AdminPayload;
  redemptionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCouponRedemption> {
  const redemption =
    await MyGlobal.prisma.shopping_mall_coupon_redemptions.findUnique({
      where: { id: props.redemptionId },
    });

  if (!redemption) {
    throw new HttpException("Coupon redemption not found", 404);
  }

  return {
    id: redemption.id,
    customer_id: redemption.customer_id,
    coupon_id: redemption.coupon_id,
    order_id: redemption.order_id,
    discount_amount: redemption.discount_amount,
    discount_type: redemption.discount_type,
    applied_at: toISOStringSafe(redemption.applied_at),
    created_at: toISOStringSafe(redemption.created_at),
    is_valid: redemption.is_valid,
    "x-autobe-prisma-schema": "shopping_mall_coupon_redemptions",
  };
}
