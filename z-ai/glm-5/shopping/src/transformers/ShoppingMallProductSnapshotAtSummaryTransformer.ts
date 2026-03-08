import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        images: true,
        created_at: true,
        skuSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_snapshot_skusesFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot.ISummary> {
    const imageUrls: string[] = JSON.parse(input.images);
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      base_price: input.base_price,
      thumbnail: imageUrls.length > 0 ? imageUrls[0] : null,
      variantCount: input.skuSnapshots.length,
      created_at: input.created_at.toISOString(),
    };
  }
}
