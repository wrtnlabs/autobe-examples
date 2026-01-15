import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductEnriched } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductEnriched";
import { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantAttributeSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttributeSummary";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallProductImageAtSummaryTransformer } from "./ShoppingMallProductImageAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";

export namespace ShoppingMallProductEnrichedTransformer {
  export type Payload = Prisma.shopping_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        shopping_mall_product_secondary_categories:
          ShoppingMallCategoryAtSummaryTransformer.select(),
        shopping_mall_product_images:
          ShoppingMallProductImageAtSummaryTransformer.select(),
        shopping_mall_product_variants:
          ShoppingMallProductVariantAtSummaryTransformer.select(),
        shopping_mall_product_reviews: {
          select: {
            id: true,
            product: true,
            rating: true,
            comment: true,
            created_at: true,
          },
        },
        shopping_mall_product_questions: {
          select: {
            id: true,
            product: true,
            question: true,
            created_at: true,
          },
        },
        shopping_mall_product_view_stats: {
          select: {
            product: true,
            view_count: true,
          },
        },
        shopping_mall_product_sales_stats: {
          select: {
            product: true,
            units_sold: true,
            conversion_rate: true,
          },
        },
        shopping_mall_product_snapshots: {
          select: {
            product: true,
            created_at: true,
          },
        },
        shopping_mall_reviews: {
          select: {
            id: true,
            product: true,
            rating: true,
            comment: true,
            created_at: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductEnriched> {
    // Normalize name to code: lowercase and replace spaces with hyphens
    const normalizeCode = (name: string) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    };
    return {
      id: input.id,
      code: normalizeCode(input.name),
      title: input.name,
      description: input.description,
      status: input.status as "draft" | "archived" | "published",
      brand: null as IShoppingMallProductBrand,
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      secondary_categories: await ArrayUtil.asyncMap(
        input.shopping_mall_product_secondary_categories,
        (category) =>
          ShoppingMallCategoryAtSummaryTransformer.transform(category),
      ),
      images: await ArrayUtil.asyncMap(
        input.shopping_mall_product_images,
        (image) =>
          ShoppingMallProductImageAtSummaryTransformer.transform(image),
      ),
      tags: [], // Empty array - product_tags relation is not used in this DTO and not selectable
      variants: await ArrayUtil.asyncMap(
        input.shopping_mall_product_variants,
        (variant) =>
          ShoppingMallProductVariantAtSummaryTransformer.transform(variant),
      ),
      attributes: null as IShoppingMallProductAttribute[],
    };
  }
}
