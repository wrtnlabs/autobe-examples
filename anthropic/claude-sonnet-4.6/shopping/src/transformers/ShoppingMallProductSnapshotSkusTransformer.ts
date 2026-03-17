import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotSkusOptionTransformer } from "./ShoppingMallProductSnapshotSkusOptionTransformer";

export namespace ShoppingMallProductSnapshotSkusTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshot_skusesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        snapshot: {
          select: {
            id: true,
          },
        },
        variant: {
          select: {
            id: true,
          },
        },
        options: ShoppingMallProductSnapshotSkusOptionTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_snapshot_skusesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotSkus> {
    return {
      id: input.id,
      productSnapshotId: input.snapshot.id,
      productVariantId: input.variant?.id ?? null,
      skuCode: input.sku_code,
      price: input.price,
      options: await ArrayUtil.asyncMap(
        input.options,
        ShoppingMallProductSnapshotSkusOptionTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
