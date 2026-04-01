import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_code: true,
        snapshot_name: true,
        snapshot_description: true,
        snapshot_category_id: true,
        snapshot_seller_id: true,
        display_price: true,
        is_listed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_product_id: true,
        product: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot.ISummary> {
    return {
      id: input.id,
      snapshot_code: input.snapshot_code,
      snapshot_name: input.snapshot_name,
      snapshot_description: input.snapshot_description,
      snapshot_category_id: input.snapshot_category_id,
      snapshot_seller_id: input.snapshot_seller_id,
      display_price: input.display_price,
      is_listed: input.is_listed,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      shopping_mall_product_id: input.shopping_mall_product_id,
    };
  }
}
