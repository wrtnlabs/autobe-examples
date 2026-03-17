import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallProductAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct.ISummary> {
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      category: input.category
        ? await ShoppingMallCategoryAtSummaryTransformer.transform(
            input.category,
          )
        : null,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      primaryImageUrl: input.images[0]?.url ?? null,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        base_price: true,
        created_at: true,
        deleted_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        images: {
          select: {
            url: true,
            sequence: true,
          },
          orderBy: {
            sequence: "asc" as const,
          },
          take: 1,
        } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export type Payload = Prisma.shopping_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
}
