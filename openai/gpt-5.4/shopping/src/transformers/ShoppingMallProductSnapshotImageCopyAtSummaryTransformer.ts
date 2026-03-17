import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotImageCopyAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_product_snapshot_image_copiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sequence: true,
        image_uri: true,
        thumbnail: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_product_snapshot_image_copiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotImageCopy.ISummary> {
    return {
      id: input.id,
      sequence: input.sequence,
      image_uri: input.image_uri,
      thumbnail: input.thumbnail,
      created_at: input.created_at.toISOString(),
    };
  }
}
