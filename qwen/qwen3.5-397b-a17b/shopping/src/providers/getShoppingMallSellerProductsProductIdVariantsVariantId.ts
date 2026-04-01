import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        deleted_at: null,
      },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      404,
    );
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: variant.shopping_mall_product_id,
        deleted_at: null,
      },
      select: {
        base_price: true,
        variants: {
          where: { deleted_at: null },
          select: {
            price_override: true,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    });
  const variantOptions =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findMany({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        optionValue: {
          select: {
            id: true,
            name: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            optionDefinition: {
              select: {
                id: true,
                name: true,
                created_at: true,
              },
            } satisfies Prisma.shopping_mall_product_option_definitionsFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_product_option_valuesFindManyArgs,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const prices = product.variants
    .map((v: { price_override: number | null }) => v.price_override)
    .filter((p: number | null): p is number => p !== null);
  const minPrice =
    prices.length > 0 ? Math.min(...prices) : Number(product.base_price);
  const maxPrice =
    prices.length > 0 ? Math.max(...prices) : Number(product.base_price);
  return {
    id: variant.id,
    skuCode: variant.sku_code,
    priceOverride: variant.price_override,
    product: {
      min: minPrice,
      max: maxPrice,
    } satisfies IShoppingMallProduct.ISummary,
    variantOptions: await ArrayUtil.asyncMap(
      variantOptions,
      async (vo) =>
        ({
          id: vo.optionValue.id,
          name: vo.optionValue.name,
          optionDefinition: {
            id: vo.optionValue.optionDefinition.id,
            name: vo.optionValue.optionDefinition.name,
            created_at:
              vo.optionValue.optionDefinition.created_at.toISOString(),
            product: {
              min: minPrice,
              max: maxPrice,
            } satisfies IShoppingMallProduct.ISummary,
          } satisfies IShoppingMallProductOptionDefinition.ISummary,
          created_at: vo.optionValue.created_at.toISOString(),
          updated_at: vo.optionValue.updated_at.toISOString(),
          deleted_at: vo.optionValue.deleted_at?.toISOString() ?? null,
        }) satisfies IShoppingMallProductOptionValue.ISummary,
    ),
    createdAt: variant.created_at.toISOString(),
    updatedAt: variant.updated_at.toISOString(),
    deletedAt: variant.deleted_at?.toISOString() ?? null,
  };
}
