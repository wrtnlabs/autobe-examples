import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdVariants(props: {
  productId: string;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.productId },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  const updated = await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.productId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id as string & tags.Format<"uuid">,
    shopping_mall_product_id: updated.shopping_mall_product_id as string &
      tags.Format<"uuid">,
    sku: updated.sku,
    option_values: updated.option_values,
    price_override: updated.price_override,
    stock_quantity: updated.stock_quantity,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
