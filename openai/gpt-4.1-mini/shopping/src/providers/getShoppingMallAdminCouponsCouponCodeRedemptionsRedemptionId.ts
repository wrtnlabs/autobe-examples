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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminCouponsCouponCodeRedemptionsRedemptionId(props: {
  admin: AdminPayload;
  couponCode: string;
  redemptionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCouponRedemption> {
  const redemption =
    await MyGlobal.prisma.shopping_mall_coupon_redemptions.findUnique({
      where: { id: props.redemptionId },
    });

  if (!redemption) {
    throw new HttpException("Coupon redemption not found", 404);
  }

  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findUnique({
    where: { id: redemption.shopping_mall_coupon_id },
  });

  if (!coupon) {
    throw new HttpException("Coupon not found", 404);
  }

  if (coupon.code !== props.couponCode) {
    throw new HttpException(
      "Coupon redemption does not belong to the specified coupon code",
      404,
    );
  }

  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: redemption.shopping_mall_customer_id },
  });

  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: redemption.shopping_mall_order_id },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: order.shopping_mall_seller_id },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  return {
    id: redemption.id,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      status: typia.assert<"active" | "inactive" | "expired" | "used">(
        coupon.status,
      ),
      valid_from: toISOStringSafe(coupon.start_at),
      valid_until: toISOStringSafe(coupon.end_at),
      description: coupon.description ?? "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      minimum_order_amount: coupon.minimum_order_amount ?? undefined,
      maximum_discount_amount: coupon.maximum_discount_amount ?? undefined,
      usage_limit: coupon.usage_limit ?? undefined,
      created_at: toISOStringSafe(coupon.created_at),
      updated_at: coupon.updated_at
        ? toISOStringSafe(coupon.updated_at)
        : undefined,
      deleted_at: coupon.deleted_at ? toISOStringSafe(coupon.deleted_at) : null,
    },
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      status: "inactive" satisfies "inactive",
      created_at: toISOStringSafe(customer.created_at),
      updated_at: customer.updated_at
        ? toISOStringSafe(customer.updated_at)
        : undefined,
    },
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        status: "inactive" satisfies "inactive",
        created_at: toISOStringSafe(customer.created_at),
        updated_at: customer.updated_at
          ? toISOStringSafe(customer.updated_at)
          : undefined,
      },
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        status: typia.assert<"active" | "inactive" | "suspended">(
          seller.status,
        ),
        business_status: typia.assert<"approved" | "pending" | "rejected">(
          seller.business_status,
        ),
        created_at: toISOStringSafe(seller.created_at),
        updated_at: seller.updated_at
          ? toISOStringSafe(seller.updated_at)
          : undefined,
        deleted_at: seller.deleted_at
          ? toISOStringSafe(seller.deleted_at)
          : null,
      },
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
    },
    redeemed_amount: redemption.redeemed_amount ?? undefined,
    redeemed_at: toISOStringSafe(redemption.redeemed_at),
    created_at: toISOStringSafe(redemption.created_at),
    updated_at: toISOStringSafe(redemption.updated_at),
    deleted_at: redemption.deleted_at
      ? toISOStringSafe(redemption.deleted_at)
      : null,
  };
}
