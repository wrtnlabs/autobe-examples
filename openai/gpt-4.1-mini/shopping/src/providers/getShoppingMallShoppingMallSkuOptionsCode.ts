import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

export async function getShoppingMallShoppingMallSkuOptionsCode(props: {
  code: string;
}): Promise<IShoppingMallSkuOption> {
  const found = await MyGlobal.prisma.shopping_mall_sku_options.findUnique({
    where: { code: props.code },
  });

  if (!found) {
    throw new HttpException("SKU option not found", 404);
  }

  return {
    code: found.code,
    name: found.name,
    priceAdjustment: found.price_adjustment,
    groupCode: found.shopping_mall_sku_option_group_id,
    createdAt: toISOStringSafe(found.created_at),
    updatedAt: toISOStringSafe(found.updated_at),
    deletedAt:
      found.deleted_at === null ? null : toISOStringSafe(found.deleted_at),
  };
}
