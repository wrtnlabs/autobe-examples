import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCouponsCouponCodeRedemptionsRedemptionId(props: {
  admin: AdminPayload;
  couponCode: string;
  redemptionId: string;
}): Promise<void> {
  const redemption =
    await MyGlobal.prisma.shopping_mall_coupon_redemptions.findUnique({
      where: {
        id: props.redemptionId,
      },
    });

  if (!redemption) {
    throw new HttpException("Coupon redemption not found.", 404);
  }

  if (redemption.shopping_mall_coupon_id !== props.couponCode) {
    throw new HttpException("Coupon code does not match the redemption.", 400);
  }

  await MyGlobal.prisma.shopping_mall_coupon_redemptions.delete({
    where: {
      id: props.redemptionId,
    },
  });
}
