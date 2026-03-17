import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductPurchaseSnapshotOptionValueAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductPurchaseSnapshotOptionValue.ISummary> {
    return {
      id: input.id,
      option_name: input.option_name,
      option_value: input.option_value,
      display_order: input.display_order,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        option_name: true,
        option_value: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productPurchaseSnapshot: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_purchase_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_purchase_snapshot_option_valuesFindManyArgs;
  }
  export type Payload =
    Prisma.shopping_mall_product_purchase_snapshot_option_valuesGetPayload<
      ReturnType<typeof select>
    >;
}
