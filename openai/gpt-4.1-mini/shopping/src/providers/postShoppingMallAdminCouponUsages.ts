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

export async function postShoppingMallAdminCouponUsages(props: {
  admin: AdminPayload;
  body: IShoppingMallCouponUsage.ICreate;
}): Promise<IShoppingMallCouponUsage> {
  // Generate UUID v4 with proper type
  const id: string & tags.Format<"uuid"> = v4();

  // Current timestamp as ISO string & proper type
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  await MyGlobal.prisma.shopping_mall_coupon_usages.create({
    data: {
      id,
      shopping_mall_coupon_id: props.body.shopping_mall_coupon_id,
      used_at: props.body.used_at,
      order_id: props.body.order_id ?? null,
      shopping_mall_customer_id: props.admin.id,
      shopping_mall_customer_session_id: props.admin.session_id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  const couponUsage =
    await MyGlobal.prisma.shopping_mall_coupon_usages.findUnique({
      where: { id },
    });

  if (!couponUsage) {
    throw new HttpException(
      "Coupon usage record not found after creation.",
      404,
    );
  }

  return {
    id: couponUsage.id satisfies string & tags.Format<"uuid"> as string &
      tags.Format<"uuid">,
    shopping_mall_coupon: {
      id: couponUsage.shopping_mall_coupon_id satisfies string &
        tags.Format<"uuid"> as string & tags.Format<"uuid">,
      code: "", // No info; use empty string as placeholder
      type: "", // No info; use empty string as placeholder
      discount_value: 0, // No info; use zero as placeholder
      start_date: "1970-01-01T00:00:00.000Z" satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      end_date: "1970-01-01T00:00:00.000Z" satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
    },
    shopping_mall_customer: {
      id: couponUsage.shopping_mall_customer_id satisfies string &
        tags.Format<"uuid"> as string & tags.Format<"uuid">,
      email: "" as string,
      name: "" as string,
    },
    shopping_mall_customer_session: {
      id: couponUsage.shopping_mall_customer_session_id satisfies string &
        tags.Format<"uuid"> as string & tags.Format<"uuid">,
      shopping_mall_customer_id:
        couponUsage.shopping_mall_customer_id satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
      ip: "" as string,
      href: "" as string,
      referrer: "" as string,
      created_at: "1970-01-01T00:00:00.000Z" satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
    },
    used_at: toISOStringSafe(couponUsage.used_at),
    order_id: couponUsage.order_id ?? null,
    created_at: toISOStringSafe(couponUsage.created_at),
    updated_at: toISOStringSafe(couponUsage.updated_at),
    deleted_at:
      couponUsage.deleted_at === null
        ? null
        : toISOStringSafe(couponUsage.deleted_at),
  } satisfies IShoppingMallCouponUsage;
}
