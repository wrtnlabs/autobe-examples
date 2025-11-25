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

export async function putShoppingMallAdminCouponsCouponCode(props: {
  admin: AdminPayload;
  couponCode: string;
  body: IShoppingMallCoupon.IUpdate;
}): Promise<IShoppingMallCoupon> {
  const existingCoupon = await MyGlobal.prisma.shopping_mall_coupons.findFirst({
    where: { code: props.couponCode, deleted_at: null },
  });

  if (!existingCoupon) {
    throw new HttpException(
      `Coupon with code ${props.couponCode} not found`,
      404,
    );
  }

  if (props.body.code !== props.couponCode) {
    const codeConflict = await MyGlobal.prisma.shopping_mall_coupons.findFirst({
      where: { code: props.body.code, deleted_at: null },
    });

    if (codeConflict) {
      throw new HttpException(
        `Coupon code ${props.body.code} already exists`,
        400,
      );
    }
  }

  const updated = await MyGlobal.prisma.shopping_mall_coupons.update({
    where: { code: props.couponCode },
    data: {
      code: props.body.code,
      type: props.body.type,
      discount_value: props.body.discount_value,
      start_date: props.body.start_date,
      end_date: props.body.end_date,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    type: updated.type,
    discount_value: updated.discount_value,
    start_date: toISOStringSafe(updated.start_date) as string &
      tags.Format<"date-time">,
    end_date: toISOStringSafe(updated.end_date) as string &
      tags.Format<"date-time">,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? (toISOStringSafe(updated.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
  };
}
