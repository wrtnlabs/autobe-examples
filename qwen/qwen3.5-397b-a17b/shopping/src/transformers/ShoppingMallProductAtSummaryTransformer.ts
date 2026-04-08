import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";
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
            url: true,
            display_order: true,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
        variants: {
          select: {
            inventoryRecords: true,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct.ISummary> {
    // Compute thumbnailUrl: first non-deleted image by display_order
    const activeImages = input.images
      .filter((img) => img.deleted_at === null)
      .sort((a, b) => a.display_order - b.display_order);
    const thumbnailUrl =
      activeImages.length > 0 ? activeImages[0].url : undefined;
    // Compute inStock: check if any variant has positive inventory
    const inStock = input.variants.some((variant) => {
      const totalQuantity = variant.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_delta,
        0,
      );
      return totalQuantity > 0;
    });
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      thumbnailUrl: thumbnailUrl,
      inStock: inStock,
      createdAt: toISOStringSafe(input.created_at),
    } satisfies IShoppingMallProduct.ISummary;
  }
}
