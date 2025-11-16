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

export async function postShoppingMallCustomerCouponsCouponCodeRedemptions(props: {
  customer: CustomerPayload;
  couponCode: string;
  body: IShoppingMallCouponRedemption.ICreate;
}): Promise<IShoppingMallCouponRedemption> {
  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findFirst({
    where: {
      code: props.couponCode,
      status: "active",
      deleted_at: null,
    },
  });

  if (!coupon) {
    throw new HttpException("Coupon not found or not active", 404);
  }

  const existingRedemption =
    await MyGlobal.prisma.shopping_mall_coupon_redemptions.findFirst({
      where: {
        shopping_mall_coupon_id: coupon.id,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });

  if (
    existingRedemption &&
    coupon.usage_limit !== undefined &&
    coupon.usage_limit !== null
  ) {
    throw new HttpException("Coupon already redeemed by customer", 400);
  }

  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const redemptionId = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.shopping_mall_coupon_redemptions.create({
    data: {
      id: redemptionId,
      shopping_mall_coupon_id: coupon.id,
      shopping_mall_customer_id: props.customer.id,
      redeemed_amount: 0,
      redeemed_at: toISOStringSafe(props.body.redemption_date),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  await MyGlobal.prisma.shopping_mall_coupons.update({
    where: { id: coupon.id },
    data: { updated_at: now },
  });

  const createdWithRelations =
    await MyGlobal.prisma.shopping_mall_coupon_redemptions.findUnique({
      where: { id: redemptionId },
      include: { coupon: true, customer: true },
    });

  if (!createdWithRelations) {
    throw new HttpException(
      "Failed to retrieve created coupon redemption",
      500,
    );
  }

  return {
    id: createdWithRelations.id,
    coupon: {
      id: createdWithRelations.coupon.id,
      code: createdWithRelations.coupon.code,
      status: typia.assert<"active" | "inactive" | "expired" | "used">(
        createdWithRelations.coupon.status,
      ),
      discount_type: createdWithRelations.coupon.discount_type ?? "",
      discount_value: createdWithRelations.coupon.discount_value,
      description: createdWithRelations.coupon.description ?? "",
      minimum_order_amount:
        createdWithRelations.coupon.minimum_order_amount ?? undefined,
      maximum_discount_amount:
        createdWithRelations.coupon.maximum_discount_amount ?? undefined,
      usage_limit: createdWithRelations.coupon.usage_limit ?? undefined,
      created_at: toISOStringSafe(
        createdWithRelations.coupon.created_at ?? new Date(),
      ),
      updated_at: toISOStringSafe(
        createdWithRelations.coupon.updated_at ?? new Date(),
      ),
      deleted_at: createdWithRelations.coupon.deleted_at ?? null,
      valid_from: toISOStringSafe(
        createdWithRelations.coupon.start_at ?? new Date(),
      ),
      valid_until: toISOStringSafe(
        createdWithRelations.coupon.end_at ?? new Date(),
      ),
    },
    customer: {
      id: createdWithRelations.customer.id,
      email: createdWithRelations.customer.email,
      name: createdWithRelations.customer.name,
      created_at: toISOStringSafe(
        createdWithRelations.customer.created_at ?? new Date(),
      ),
      updated_at: createdWithRelations.customer.updated_at ?? undefined,
    },
    redeemed_amount: createdWithRelations.redeemed_amount ?? undefined,
    redeemed_at: toISOStringSafe(
      createdWithRelations.redeemed_at ?? new Date(),
    ),
    created_at: toISOStringSafe(createdWithRelations.created_at ?? new Date()),
    updated_at: toISOStringSafe(createdWithRelations.updated_at ?? new Date()),
    deleted_at: createdWithRelations.deleted_at ?? null,
  };
}
