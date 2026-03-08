import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSku";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "./ShoppingMallProductSnapshotAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotSkuAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshot_skusesGetPayload<
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
        created_at: true,
        snapshot: ShoppingMallProductSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_snapshot_skusesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotSku.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      option_values: JSON.parse(input.option_values),
      price: input.price ?? undefined,
      stock_quantity: input.stock_quantity,
      created_at: input.created_at.toISOString(),
      snapshot: await ShoppingMallProductSnapshotAtSummaryTransformer.transform(
        input.snapshot,
      ),
    };
  }
}
