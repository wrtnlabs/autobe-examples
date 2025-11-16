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

export async function postShoppingMallAdminCoupons(props: {
  admin: AdminPayload;
  body: IShoppingMallCoupon.ICreate;
}): Promise<IShoppingMallCoupon> {
  const nowISO = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_coupons.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      code: props.body.code,
      description: props.body.description,
      discount_type: props.body.discount_type,
      discount_value: props.body.discount_value,
      minimum_order_amount: props.body.minimum_order_amount,
      maximum_discount_amount: props.body.maximum_discount_amount,
      start_at: props.body.start_at,
      end_at: props.body.end_at,
      usage_limit: props.body.usage_limit,
      status: props.body.status,
      created_at: nowISO,
      updated_at: nowISO,
    },
  });

  return {
    id: created.id,
    code: created.code,
    description: created.description ?? "",
    discount_type: typia.assert<"fixed" | "percentage">(created.discount_type),
    discount_value: created.discount_value,
    minimum_order_amount: created.minimum_order_amount ?? null,
    maximum_discount_amount: created.maximum_discount_amount ?? null,
    start_at: toISOStringSafe(created.start_at),
    end_at: toISOStringSafe(created.end_at),
    usage_limit: created.usage_limit ?? null,
    per_customer_limit: null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  } satisfies IShoppingMallCoupon;
}
