import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductCategoryAtSummaryTransformer } from "./ShoppingMallProductCategoryAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallSaleAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_salesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        base_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        description: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        category: ShoppingMallProductCategoryAtSummaryTransformer.select(),
        snapshots: true,
        saleUnits: true,
        images: true,
        saleSpecifications: true,
        saleReviews: true,
        saleQuestions: true,
        favorites: true,
        promotions: true,
        viewStats: true,
      },
    } satisfies Prisma.shopping_mall_salesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSale.ISummary> {
    return {
      id: input.id,
      name: input.name,
      basePrice: Number(input.base_price),
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      category: await ShoppingMallProductCategoryAtSummaryTransformer.transform(
        input.category,
      ),
    };
  }
}
