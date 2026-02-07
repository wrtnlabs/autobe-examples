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

export async function patchShoppingMallProductsProductIdVariantsVariantIdInventory(props: {
  productId: string;
  variantId: string;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        product_id: true,
        seller_id: true,
        sku: true,
        option_values: true,
        price_override: true,
        stock: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  return {
    id: variant.id as string & tags.Format<"uuid">,
    product_id: variant.product_id as string & tags.Format<"uuid">,
    seller_id: variant.seller_id as string & tags.Format<"uuid">,
    sku: variant.sku,
    option_values: variant.option_values,
    price_override: variant.price_override,
    stock: variant.stock,
    created_at: toISOStringSafe(variant.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(variant.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: variant.deleted_at
      ? (toISOStringSafe(variant.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
  };
}
