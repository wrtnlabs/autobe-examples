import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponRedemption";
import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCouponsCouponCodeRedemptionsRedemptionId(props: {
  customer: CustomerPayload;
  couponCode: string;
  redemptionId: string & tags.Format<"uuid">;
  body: IShoppingMallCouponRedemption.IUpdate;
}): Promise<IShoppingMallCouponRedemption> {
  const redemption =
    await MyGlobal.prisma.shopping_mall_coupon_redemptions.findFirst({
      where: {
        id: props.redemptionId,
        coupon: { code: props.couponCode },
      },
      include: {
        coupon: true,
        customer: true,
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

  if (!redemption) {
    throw new HttpException("Coupon redemption not found", 404);
  }

  if (redemption.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const now = new Date();

  const updated = await MyGlobal.prisma.shopping_mall_coupon_redemptions.update(
    {
      where: { id: props.redemptionId },
      data: {
        redeemed_amount: props.body.redeemed_amount ?? undefined,
        updated_at: toISOStringSafe(now),
      },
      include: {
        coupon: true,
        customer: true,
        order: {
          include: {
            customer: true,
          },
        },
      },
    },
  );

  let discountRate = 0;
  if (updated.coupon.discount_type === "percent") {
    discountRate = updated.coupon.discount_value / 100;
  }

  return {
    id: updated.id,
    coupon: {
      id: updated.coupon.id,
      code: updated.coupon.code,
      status: updated.coupon.status as
        | "active"
        | "inactive"
        | "expired"
        | "used",
      valid_from: toISOStringSafe(updated.coupon.start_at),
      valid_until: toISOStringSafe(updated.coupon.end_at),
      description: updated.coupon.description ?? "",
      discount_type: updated.coupon.discount_type,
      discount_value: updated.coupon.discount_value,
      discount_rate: discountRate,
      minimum_order_amount: updated.coupon.minimum_order_amount ?? undefined,
      maximum_discount_amount:
        updated.coupon.maximum_discount_amount ?? undefined,
      usage_limit: updated.coupon.usage_limit ?? undefined,
      created_at: toISOStringSafe(updated.coupon.created_at),
      updated_at: toISOStringSafe(updated.coupon.updated_at),
      deleted_at: updated.coupon.deleted_at
        ? toISOStringSafe(updated.coupon.deleted_at)
        : null,
    },
    customer: {
      id: updated.customer.id,
      email: updated.customer.email,
      name: updated.customer.name,
      status: "active",
      created_at: toISOStringSafe(updated.customer.created_at),
      updated_at: updated.customer.updated_at
        ? toISOStringSafe(updated.customer.updated_at)
        : undefined,
    },
    order: updated.order
      ? {
          id: updated.order.id,
          order_number: updated.order.order_number,
          status: updated.order.status,
          total_amount: updated.order.total_amount,
          customer: {
            id: updated.order.customer.id,
            email: updated.order.customer.email,
            name: updated.order.customer.name,
            created_at: toISOStringSafe(updated.order.customer.created_at),
            updated_at: updated.order.customer.updated_at
              ? toISOStringSafe(updated.order.customer.updated_at)
              : undefined,
          },
          created_at: toISOStringSafe(updated.order.created_at),
          updated_at: toISOStringSafe(updated.order.updated_at),
        }
      : undefined,
    redeemed_amount: updated.redeemed_amount ?? undefined,
    redeemed_at: toISOStringSafe(updated.redeemed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
