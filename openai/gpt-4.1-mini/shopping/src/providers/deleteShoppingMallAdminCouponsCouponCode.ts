import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const existing = await MyGlobal.prisma.shopping_mall_coupons.findUnique({
    where: { code: props.couponCode },
  });

  if (!existing) {
    throw new HttpException("Coupon not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_coupons.delete({
    where: { code: props.couponCode },
  });
}
