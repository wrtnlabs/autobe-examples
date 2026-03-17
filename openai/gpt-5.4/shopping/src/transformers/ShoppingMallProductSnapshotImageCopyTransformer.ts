import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "./ShoppingMallProductSnapshotAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotImageCopyTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotImageCopy> {
    return {
      id: input.id,
      productSnapshot:
        await ShoppingMallProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      sequence: input.sequence,
      image_uri: input.image_uri,
      thumbnail: input.thumbnail,
      created_at: input.created_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        productSnapshot:
          ShoppingMallProductSnapshotAtSummaryTransformer.select(),
        sequence: true,
        image_uri: true,
        thumbnail: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_product_snapshot_image_copiesFindManyArgs;
  }
  export type Payload =
    Prisma.shopping_mall_product_snapshot_image_copiesGetPayload<
      ReturnType<typeof select>
    >;
}
