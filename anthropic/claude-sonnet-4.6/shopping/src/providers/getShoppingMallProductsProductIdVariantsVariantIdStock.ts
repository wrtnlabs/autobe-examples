import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantStock";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdVariantsVariantIdStock(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantStock> {
  // Step 1: Validate that the product exists and is not deleted
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Validate that the variant exists, is not deleted, and belongs to the product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku: true,
        price_override: true,
        shopping_mall_product_id: true,
      },
    });
  // Step 3: Compute the current stock quantity by summing all inventory records
  const aggregate =
    await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
      where: {
        shopping_mall_product_variant_id: props.variantId,
      },
      _sum: {
        quantity: true,
      },
    });
  const stockQuantity = aggregate._sum.quantity ?? 0;
  // Step 4: Determine availability (true when stock > 0)
  const isAvailable = stockQuantity > 0;
  // Step 5: Return the response object
  return {
    variantId: variant.id,
    productId: variant.shopping_mall_product_id,
    sku: variant.sku,
    priceOverride: variant.price_override,
    stockQuantity,
    isAvailable,
  } satisfies IShoppingMallProductVariantStock;
}
