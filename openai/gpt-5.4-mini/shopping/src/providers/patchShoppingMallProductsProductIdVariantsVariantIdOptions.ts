import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantOptionAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdVariantsVariantIdOptions(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantOption.IRequest;
}): Promise<IPageIShoppingMallProductVariantOption.ISummary> {
  if (props.body.options.length === 0) {
    throw new HttpException("Variant options must not be empty.", 400);
  }
  const optionNames = new Set<string>();
  for (const option of props.body.options) {
    if (optionNames.has(option.option_name)) {
      throw new HttpException(
        "Duplicate option_name values are not allowed.",
        400,
      );
    }
    optionNames.add(option.option_name);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  if (variant.shopping_mall_product_id !== product.id) {
    throw new HttpException(
      "Variant does not belong to the specified product.",
      404,
    );
  }
  const canonicalCombination = props.body.options
    .slice()
    .sort((left, right) => left.option_name.localeCompare(right.option_name))
    .map((option) => `${option.option_name}=${option.option_value}`)
    .join("|");
  const siblingVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
        NOT: {
          id: props.variantId,
        },
      },
      select: {
        id: true,
        options: {
          select: {
            option_name: true,
            option_value: true,
          },
        },
      },
    });
  for (const sibling of siblingVariants) {
    const siblingCombination = sibling.options
      .slice()
      .sort((left, right) => left.option_name.localeCompare(right.option_name))
      .map((option) => `${option.option_name}=${option.option_value}`)
      .join("|");
    if (siblingCombination === canonicalCombination) {
      throw new HttpException(
        "Another variant already uses the same option combination.",
        400,
      );
    }
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_product_variant_options.deleteMany({
      where: {
        shopping_mall_product_variant_id: props.variantId,
      },
    });
    await prisma.shopping_mall_product_variant_options.createMany({
      data: props.body.options.map((option) => ({
        id: v4(),
        shopping_mall_product_variant_id: props.variantId,
        option_name: option.option_name,
        option_value: option.option_value,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      })),
    });
  });
  const rows =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findMany({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        deleted_at: null,
      },
      orderBy: {
        created_at: "asc",
      },
      ...ShoppingMallProductVariantOptionAtSummaryTransformer.select(),
    });
  const paginationLimit: number = props.body.limit ?? 100;
  return {
    pagination: {
      current: props.body.page ?? 1,
      limit: paginationLimit,
      records: rows.length,
      pages: rows.length === 0 ? 0 : 1,
    },
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallProductVariantOptionAtSummaryTransformer.transform,
    ),
  };
}
