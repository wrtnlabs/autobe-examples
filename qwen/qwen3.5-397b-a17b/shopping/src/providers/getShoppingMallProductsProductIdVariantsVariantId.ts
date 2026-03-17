import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { ShoppingMallProductVariantOptionTransformer } from "../transformers/ShoppingMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdVariantsVariantId(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        deleted: false,
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        stock_quantity: true,
        shopping_mall_product_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
        options: ShoppingMallProductVariantOptionTransformer.select(),
      },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to specified product",
      404,
    );
  }
  return {
    id: variant.id,
    skuCode: variant.sku_code,
    price: variant.price ?? undefined,
    stockQuantity: variant.stock_quantity,
    product: await ShoppingMallProductAtSummaryTransformer.transform(
      variant.product,
    ),
    options: await ArrayUtil.asyncMap(
      variant.options,
      ShoppingMallProductVariantOptionTransformer.transform,
    ),
    createdAt: variant.created_at.toISOString(),
    updatedAt: variant.updated_at.toISOString(),
    deletedAt: variant.deleted_at?.toISOString() ?? null,
  };
}
