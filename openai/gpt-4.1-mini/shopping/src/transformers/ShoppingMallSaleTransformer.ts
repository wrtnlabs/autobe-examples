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

export namespace ShoppingMallSaleTransformer {
  export type Payload = Prisma.shopping_mall_salesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        category: ShoppingMallProductCategoryAtSummaryTransformer.select(),
        snapshots: { select: {} },
        saleUnits: { select: {} },
        images: { select: {} },
        saleSpecifications: { select: {} },
        saleReviews: { select: {} },
        saleQuestions: { select: {} },
        favorites: { select: {} },
        promotions: { select: {} },
        viewStats: { select: {} },
      },
    } satisfies Prisma.shopping_mall_salesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallSale> {
    return {
      id: input.id,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      category: await ShoppingMallProductCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      name: input.name,
      description: input.description,
      basePrice: input.base_price,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
