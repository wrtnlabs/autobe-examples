import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotSkusOptionAtSummaryTransformer } from "./ShoppingMallProductSnapshotSkusOptionAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotSkusAtSummaryTransformer {
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
        variant: {
          select: {
            id: true,
          },
        },
        options:
          ShoppingMallProductSnapshotSkusOptionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_snapshot_skusesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotSkus.ISummary> {
    return {
      id: input.id,
      skuCode: input.sku_code,
      price: input.price,
      productVariantId: input.variant?.id ?? null,
      options: await ArrayUtil.asyncMap(
        input.options,
        ShoppingMallProductSnapshotSkusOptionAtSummaryTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
