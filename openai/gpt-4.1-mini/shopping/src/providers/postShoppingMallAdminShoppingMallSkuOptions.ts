import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShoppingMallSkuOptions(props: {
  admin: AdminPayload;
  body: IShoppingMallSkuOption.ICreate;
}): Promise<IShoppingMallSkuOption> {
  const existing = await MyGlobal.prisma.shopping_mall_sku_options.findUnique({
    where: { code: props.body.code },
  });

  if (existing !== null) {
    throw new HttpException(
      `SKU option code '${props.body.code}' already exists.`,
      409,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_sku_options.create({
    data: {
      id: v4(),
      code: props.body.code,
      name: props.body.name,
      price_adjustment: props.body.priceAdjustment,
      shopping_mall_sku_option_group_id: props.body.groupCode,
      created_at: now,
      updated_at: now,
      deleted_at:
        props.body.deletedAt !== null && props.body.deletedAt !== undefined
          ? toISOStringSafe(props.body.deletedAt)
          : null,
    },
  });

  return {
    code: created.code,
    name: created.name,
    priceAdjustment: created.price_adjustment,
    groupCode: created.shopping_mall_sku_option_group_id,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
