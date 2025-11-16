import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShoppingMallSkuOptionsCode(props: {
  seller: SellerPayload;
  code: string;
  body: IShoppingMallSkuOption.IUpdate;
}): Promise<IShoppingMallSkuOption> {
  const existed = await MyGlobal.prisma.shopping_mall_sku_options.findUnique({
    where: { code: props.code },
  });

  if (existed === null) {
    throw new HttpException("SKU option not found", 404);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_sku_options.update({
    where: { code: props.code },
    data: {
      name: props.body.name,
      price_adjustment: props.body.priceAdjustment,
      deleted_at: props.body.deletedAt ?? null,
      updated_at: now,
    },
  });

  return {
    code: updated.code,
    name: updated.name,
    priceAdjustment: updated.price_adjustment,
    groupCode: updated.shopping_mall_sku_option_group_id,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
