import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSku";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotSkuTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshot_skusesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs,
        sku_code: true,
        option_values: true,
        price: true,
        stock_quantity: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_product_snapshot_skusesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotSku> {
    return {
      id: input.id,
      productSnapshotId: input.snapshot.id,
      skuCode: input.sku_code,
      optionValues: input.option_values,
      price: input.price ?? null,
      stockQuantity: input.stock_quantity,
      createdAt: input.created_at.toISOString(),
    };
  }
}
