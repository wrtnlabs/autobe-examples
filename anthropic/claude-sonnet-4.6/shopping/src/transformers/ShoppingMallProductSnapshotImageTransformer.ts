import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotImageTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshot_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_snapshot_id: true,
        url: true,
        sequence: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_product_snapshot_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotImage> {
    return {
      id: input.id,
      product_snapshot_id: input.product_snapshot_id,
      url: input.url,
      sequence: input.sequence,
      created_at: input.created_at.toISOString(),
    };
  }
}
