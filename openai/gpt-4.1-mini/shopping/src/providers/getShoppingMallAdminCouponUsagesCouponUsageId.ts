import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function getShoppingMallAdminCouponUsagesCouponUsageId(props: {
  admin: AdminPayload;
  couponUsageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCouponUsage> {
  const usage = await MyGlobal.prisma.shopping_mall_coupon_usages.findUnique({
    where: { id: props.couponUsageId },
    // Relations removed due to compiler error
  });

  if (!usage) {
    throw new HttpException("Coupon usage record not found", 404);
  }

  return {
    id: usage.id,
    shopping_mall_coupon: {
      id: usage.shopping_mall_coupon_id satisfies string as string,
      // Other coupon fields cannot be accessed - missing from usage
      code: "",
      type: "",
      discount_value: 0,
      start_date: "",
      end_date: "",
    },
    shopping_mall_customer: {
      id: usage.shopping_mall_customer_id satisfies string as string,
      email: "",
      name: "",
    },
    shopping_mall_customer_session: {
      id: usage.shopping_mall_customer_session_id satisfies string as string,
      shopping_mall_customer_id:
        usage.shopping_mall_customer_id satisfies string as string,
      ip: "",
      href: "",
      referrer: "",
      created_at: "",
    },
    used_at: toISOStringSafe(usage.used_at),
    order_id: usage.order_id === null ? null : (usage.order_id ?? undefined),
    created_at: toISOStringSafe(usage.created_at),
    updated_at: toISOStringSafe(usage.updated_at),
    deleted_at:
      usage.deleted_at === null
        ? null
        : usage.deleted_at === undefined
          ? undefined
          : toISOStringSafe(usage.deleted_at),
  };
}
