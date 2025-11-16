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

export async function putShoppingMallAdminCouponsCouponCode(props: {
  admin: AdminPayload;
  couponCode: string;
  body: IShoppingMallCoupon.IUpdate;
}): Promise<IShoppingMallCoupon> {
  const existing = await MyGlobal.prisma.shopping_mall_coupons.findUnique({
    where: { code: props.couponCode },
  });

  if (!existing) {
    throw new HttpException("Coupon not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_coupons.update({
    where: { code: props.couponCode },
    data: {
      discount_type: props.body.discount_type,
      discount_value: props.body.discount_value,
      minimum_order_amount: Object.prototype.hasOwnProperty.call(
        props.body,
        "minimum_order_amount",
      )
        ? props.body.minimum_order_amount
        : undefined,
      maximum_discount_amount: Object.prototype.hasOwnProperty.call(
        props.body,
        "maximum_discount_amount",
      )
        ? props.body.maximum_discount_amount
        : undefined,
      start_at: Object.prototype.hasOwnProperty.call(props.body, "start_at")
        ? props.body.start_at === null
          ? undefined
          : props.body.start_at
        : undefined,
      end_at: Object.prototype.hasOwnProperty.call(props.body, "end_at")
        ? props.body.end_at === null
          ? undefined
          : props.body.end_at
        : undefined,
      usage_limit: Object.prototype.hasOwnProperty.call(
        props.body,
        "usage_limit",
      )
        ? props.body.usage_limit
        : undefined,
      status: props.body.status,
      description: Object.prototype.hasOwnProperty.call(
        props.body,
        "description",
      )
        ? props.body.description
        : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    description: updated.description === null ? "" : updated.description,
    discount_type: typia.assert<"fixed" | "percentage">(updated.discount_type),
    discount_value: updated.discount_value,
    minimum_order_amount:
      updated.minimum_order_amount === null
        ? null
        : updated.minimum_order_amount,
    maximum_discount_amount:
      updated.maximum_discount_amount === null
        ? null
        : updated.maximum_discount_amount,
    start_at: toISOStringSafe(updated.start_at),
    end_at: toISOStringSafe(updated.end_at),
    usage_limit: updated.usage_limit === null ? null : updated.usage_limit,
    per_customer_limit: null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === undefined
        ? undefined
        : updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
  } satisfies IShoppingMallCoupon;
}
