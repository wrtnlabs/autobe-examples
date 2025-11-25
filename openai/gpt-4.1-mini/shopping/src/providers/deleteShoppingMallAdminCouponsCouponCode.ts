import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCouponsCouponCode(props: {
  admin: AdminPayload;
  couponCode: string;
}): Promise<void> {
  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findUnique({
    where: { code: props.couponCode },
  });
  if (!coupon) {
    throw new HttpException("Coupon not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_coupons.delete({
    where: { code: props.couponCode },
  });
}
