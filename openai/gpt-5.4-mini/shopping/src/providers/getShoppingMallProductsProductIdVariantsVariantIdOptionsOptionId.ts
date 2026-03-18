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
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        product: {
          select: { id: true },
        },
      },
    });
  if (variant.product.id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const option =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        select: {
          id: true,
          productVariant: {
            select: {
              id: true,
              sku_code: true,
              override_price: true,
              stock_quantity: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          option_name: true,
          option_value: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (option.productVariant.id !== props.variantId) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: option.id,
    productVariant: {
      id: option.productVariant.id,
      skuCode: option.productVariant.sku_code,
      overridePrice: option.productVariant.override_price,
      stockQuantity: option.productVariant.stock_quantity,
      createdAt: option.productVariant.created_at.toISOString(),
      updatedAt: option.productVariant.updated_at.toISOString(),
      deletedAt:
        option.productVariant.deleted_at === null
          ? null
          : option.productVariant.deleted_at.toISOString(),
    } satisfies IShoppingMallProductVariant.ISummary,
    optionName: option.option_name,
    optionValue: option.option_value,
    created_at: option.created_at.toISOString(),
    updated_at: option.updated_at.toISOString(),
    deleted_at:
      option.deleted_at === null ? null : option.deleted_at.toISOString(),
  };
}
