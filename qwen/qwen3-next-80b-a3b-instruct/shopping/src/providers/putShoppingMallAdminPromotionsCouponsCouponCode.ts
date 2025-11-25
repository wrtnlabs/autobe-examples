import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminPromotionsCouponsCouponCode(props: {
  admin: AdminPayload;
  couponCode: string;
  body: IShoppingMallCoupon.IUpdate;
}): Promise<IShoppingMallCoupon> {
  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findUnique({
    where: {
      code: props.couponCode,
      deleted_at: null,
    },
  });

  if (!coupon) {
    throw new HttpException("Coupon not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_coupons.update({
    where: { code: props.couponCode },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return props.couponCode;
}
