import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_product_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price: true,
        stock_quantity: true,
        snapshot_at: true,
      },
    } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantSnapshot.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      option_values: JSON.parse(input.option_values),
      price: input.price,
      stock_quantity: input.stock_quantity,
      snapshot_at: input.snapshot_at.toISOString(),
    };
  }
}
