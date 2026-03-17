import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallProductImageAtSummaryTransformer } from "./ShoppingMallProductImageAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallProductAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        base_price: true,
        created_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        images: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
            created_at: true,
          },
          orderBy: { display_order: "asc" },
        } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
        variants: {
          select: {
            id: true,
            deleted: true,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        reviews: {
          select: {
            id: true,
            rating: true,
          },
        } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct.ISummary> {
    return {
      id: input.id,
      name: input.name,
      basePrice: Number(input.base_price),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      mainImage:
        input.images.length > 0
          ? await ShoppingMallProductImageAtSummaryTransformer.transform(
              input.images[0],
            )
          : undefined,
      variantCount: input.variants.filter((v) => !v.deleted).length,
      averageRating:
        input.reviews.length > 0
          ? input.reviews.reduce((sum, r) => sum + r.rating, 0) /
            input.reviews.length
          : undefined,
      reviewCount: input.reviews.length,
      createdAt: input.created_at.toISOString(),
    };
  }
}
