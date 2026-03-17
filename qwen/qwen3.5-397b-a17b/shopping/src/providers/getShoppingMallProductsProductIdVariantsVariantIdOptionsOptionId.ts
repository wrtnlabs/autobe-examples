import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantOption> {
  const option =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        select: {
          id: true,
          key: true,
          value: true,
          created_at: true,
          updated_at: true,
          shopping_mall_product_variant_id: true,
          variant: {
            select: {
              id: true,
              sku_code: true,
              price: true,
              stock_quantity: true,
              shopping_mall_product_id: true,
            },
          } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        },
      } satisfies Prisma.shopping_mall_product_variant_optionsFindManyArgs,
    );
  if (option.shopping_mall_product_variant_id !== props.variantId) {
    throw new HttpException("Option does not belong to specified variant", 404);
  }
  if (option.variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to specified product",
      404,
    );
  }
  return {
    id: option.id,
    key: option.key,
    value: option.value,
    variant: {
      id: option.variant.id,
      skuCode: option.variant.sku_code,
      optionValues: [],
      price: option.variant.price ?? null,
      stockQuantity: option.variant.stock_quantity,
    } satisfies IShoppingMallProductVariant.ISummary,
    created_at: toISOStringSafe(option.created_at),
    updated_at: toISOStringSafe(option.updated_at),
  };
}
