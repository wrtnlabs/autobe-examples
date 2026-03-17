import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantOptionTransformer } from "../transformers/ShoppingMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantOption> {
  // Step 1: Validate product exists and is not soft-deleted
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Validate variant exists, belongs to the product, and is not soft-deleted
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 3: Query the option record belonging to the variant
  const option =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findFirstOrThrow(
      {
        where: {
          id: props.optionId,
          product_variant_id: props.variantId,
        },
        ...ShoppingMallProductVariantOptionTransformer.select(),
      },
    );
  // Step 4: Transform and return
  return ShoppingMallProductVariantOptionTransformer.transform(option);
}
