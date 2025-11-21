import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";

export async function getShoppingMallProductsProductIdVariantsVariantId(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: {
        shopping_mall_product_id: props.productId,
        id: props.variantId,
        deleted_at: null,
      },
    });

  if (!variant) {
    throw new HttpException("Variant not found or not accessible", 404);
  }

  return {
    id: variant.id,
    title: variant.title,
    price: variant.price,
    sku: variant.sku,
    inventory_count: variant.inventory_count,
    attributes: variant.attributes,
    created_at: toISOStringSafe(variant.created_at),
    updated_at: toISOStringSafe(variant.updated_at),
    deleted_at: variant.deleted_at ? toISOStringSafe(variant.deleted_at) : null,
  };
}
