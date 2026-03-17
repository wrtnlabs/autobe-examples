import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot.ISummary> {
    return {
      id: input.id,
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      image_copy_count: input.imageCopies.length,
      variant_snapshot_count: input.variantSnapshots.length,
      created_at: input.created_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
        imageCopies: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_snapshot_image_copiesFindManyArgs,
        variantSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
}
