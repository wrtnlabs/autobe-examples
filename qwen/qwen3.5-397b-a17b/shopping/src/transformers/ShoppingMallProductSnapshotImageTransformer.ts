import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "./ShoppingMallProductSnapshotAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotImageTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshot_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        image_url: true,
        display_order: true,
        created_at: true,
        productSnapshot:
          ShoppingMallProductSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_snapshot_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotImage> {
    return {
      id: input.id,
      imageUrl: input.image_url,
      displayOrder: input.display_order,
      createdAt: input.created_at.toISOString(),
      productSnapshot:
        await ShoppingMallProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
    } satisfies IShoppingMallProductSnapshotImage;
  }
}
