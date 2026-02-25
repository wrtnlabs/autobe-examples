import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderVariantSnapshotsAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_variant_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_snapshot_id: true,
        sku_code: true,
        variant_price_override: true,
        stock_quantity: true,
        is_in_stock: true,
      },
    } satisfies Prisma.shopping_mall_order_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderVariantSnapshots.ISummary> {
    return {
      id: input.id,
      product_snapshot_id: input.product_snapshot_id,
      sku_code: input.sku_code,
      variant_price_override: input.variant_price_override ?? undefined,
      stock_quantity: input.stock_quantity,
      is_in_stock: input.is_in_stock,
    };
  }
}
