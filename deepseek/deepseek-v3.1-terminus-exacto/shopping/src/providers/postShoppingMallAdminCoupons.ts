import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminCoupons(props: {
  admin: AdminPayload;
  body: IShoppingMallCoupon.ICreate;
}): Promise<IShoppingMallCoupon> {
  // Check if coupon code already exists
  const existingCoupon = await MyGlobal.prisma.shopping_mall_coupons.findFirst({
    where: {
      code: props.body.code,
      deleted_at: null,
    },
  });

  if (existingCoupon) {
    throw new HttpException("Coupon code already exists", 400);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_coupons.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description ?? null,
      discount_type: props.body.discount_type,
      discount_value: props.body.discount_value,
      minimum_order_amount: props.body.minimum_order_amount ?? null,
      maximum_discount: props.body.maximum_discount ?? null,
      usage_limit_per_customer: props.body.usage_limit_per_customer ?? null,
      total_usage_limit: props.body.total_usage_limit ?? null,
      used_count: 0,
      valid_from: props.body.valid_from,
      valid_until: props.body.valid_until,
      is_active: props.body.is_active,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      shopping_mall_channel_id: props.body.shopping_mall_channel_id ?? null,
      shopping_mall_administrator_id: props.admin.id,
      shopping_mall_administrator_session_id: props.admin.session_id,
    },
  });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description ?? undefined,
    discount_type: created.discount_type,
    discount_value: created.discount_value,
    minimum_order_amount: created.minimum_order_amount ?? undefined,
    maximum_discount: created.maximum_discount ?? undefined,
    usage_limit_per_customer: created.usage_limit_per_customer ?? undefined,
    total_usage_limit: created.total_usage_limit ?? undefined,
    used_count: created.used_count,
    valid_from: toISOStringSafe(created.valid_from),
    valid_until: toISOStringSafe(created.valid_until),
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    shopping_mall_channel_id: created.shopping_mall_channel_id ?? undefined,
    shopping_mall_administrator_id: created.shopping_mall_administrator_id,
    shopping_mall_administrator_session_id:
      created.shopping_mall_administrator_session_id,
    channel: undefined,
    creator: undefined,
  };
}
