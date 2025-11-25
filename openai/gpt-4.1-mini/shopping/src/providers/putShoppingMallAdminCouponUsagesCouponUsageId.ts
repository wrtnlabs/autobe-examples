import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponUsage";
import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminCouponUsagesCouponUsageId(props: {
  admin: AdminPayload;
  couponUsageId: string & tags.Format<"uuid">;
  body: IShoppingMallCouponUsage.IUpdate;
}): Promise<IShoppingMallCouponUsage> {
  const existing = await MyGlobal.prisma.shopping_mall_coupon_usages.findUnique(
    {
      where: { id: props.couponUsageId },
    },
  );

  if (!existing) {
    throw new HttpException("Coupon usage record not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_coupon_usages.update({
    where: { id: props.couponUsageId },
    data: {
      used_at: props.body.used_at,
      order_id: props.body.order_id ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  const coupon = await MyGlobal.prisma.shopping_mall_coupons.findUnique({
    where: { id: updated.shopping_mall_coupon_id },
  });

  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: updated.shopping_mall_customer_id },
  });

  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: updated.shopping_mall_customer_session_id },
    });

  if (!coupon || !customer || !session) {
    throw new HttpException("Related data not found", 404);
  }

  return {
    id: updated.id,
    shopping_mall_coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discount_value: coupon.discount_value,
      start_date: toISOStringSafe(coupon.start_date),
      end_date: toISOStringSafe(coupon.end_date),
    },
    shopping_mall_customer: {
      id: customer.id,
      email: customer.email,
      name: (customer as unknown as { name: string }).name,
    },
    shopping_mall_customer_session: {
      id: session.id,
      shopping_mall_customer_id: session.shopping_mall_customer_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
    },
    used_at: toISOStringSafe(updated.used_at),
    order_id: updated.order_id ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
