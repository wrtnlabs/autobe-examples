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

export async function postShoppingMallAdminCoupons(props: {
  admin: AdminPayload;
  body: IShoppingMallCoupon.ICreate;
}): Promise<IShoppingMallCoupon> {
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_coupons.create({
    data: {
      id: v4(),
      code: props.body.code,
      type: props.body.type,
      discount_value: props.body.discount_value,
      start_date: props.body.start_date,
      end_date: props.body.end_date,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    code: created.code,
    type: created.type,
    discount_value: created.discount_value,
    start_date: toISOStringSafe(created.start_date),
    end_date: toISOStringSafe(created.end_date),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
