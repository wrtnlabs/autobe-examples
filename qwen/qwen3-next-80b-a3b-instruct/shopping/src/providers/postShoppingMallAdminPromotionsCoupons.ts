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

export async function postShoppingMallAdminPromotionsCoupons(props: {
  admin: AdminPayload;
  body: IShoppingMallCoupon.ICreate;
}): Promise<IShoppingMallCoupon> {
  // The IShoppingMallCoupon.ICreate is defined as a string, representing the coupon code
  const code = props.body;

  // Generate dates for coupon validity
  const now = new Date();
  const validFrom = now; // Coupon valid immediately
  const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  // Create coupon with all required fields from shopping_mall_coupons schema
  const createdCoupon = await MyGlobal.prisma.shopping_mall_coupons.create({
    data: {
      code: code,
      id: v4() as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      status: "active",
      created_by_admin_id: props.admin.id,
      max_usage_count: 10, // Based on schema: must be greater than 0
      usage_count: 0, // Starts at 0
      valid_from: toISOStringSafe(validFrom),
      valid_until: toISOStringSafe(validUntil),
    },
  });

  // Return the coupon code as required by the API
  return createdCoupon.code;
}
