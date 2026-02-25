import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSaleSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_sale_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_sale_id: true,
        title: true,
        description: true,
        category_id: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sale: {
          select: {
            id: true,
          },
        },
        saleUnitSnapshots: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_sale_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSaleSnapshot> {
    return {
      id: input.id,
      shoppingMallSaleId: input.shopping_mall_sale_id,
      title: input.title,
      description: input.description,
      categoryId: input.category_id,
      basePrice: input.base_price,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
