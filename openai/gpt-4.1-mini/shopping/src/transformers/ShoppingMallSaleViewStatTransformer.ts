import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSaleViewStatTransformer {
  export type Payload = Prisma.shopping_mall_sale_view_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sale: {
          select: {
            id: true,
          },
        },
        view_count: true,
        unique_view_count: true,
        first_viewed_at: true,
        last_viewed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_sale_view_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSaleViewStat> {
    return {
      id: input.id,
      shoppingMallSaleId: input.sale.id,
      viewCount: input.view_count,
      uniqueViewCount: input.unique_view_count,
      firstViewedAt: input.first_viewed_at.toISOString(),
      lastViewedAt: input.last_viewed_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
