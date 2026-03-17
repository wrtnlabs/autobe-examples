import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotImageTransformer } from "./ShoppingMallProductSnapshotImageTransformer";
import { ShoppingMallProductSnapshotSkusTransformer } from "./ShoppingMallProductSnapshotSkusTransformer";

export namespace ShoppingMallProductSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product: {
          select: {
            id: true,
          },
        },
        category: {
          select: {
            id: true,
          },
        },
        category_name: true,
        name: true,
        description: true,
        base_price: true,
        snapshotImages: ShoppingMallProductSnapshotImageTransformer.select(),
        snapshotSkuses: ShoppingMallProductSnapshotSkusTransformer.select(),
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot> {
    return {
      id: input.id,
      productId: input.product?.id ?? null,
      categoryId: input.category?.id ?? null,
      categoryName: input.category_name ?? null,
      name: input.name,
      description: input.description ?? null,
      basePrice: input.base_price,
      images: await ArrayUtil.asyncMap(
        input.snapshotImages,
        ShoppingMallProductSnapshotImageTransformer.transform,
      ),
      skuses: await ArrayUtil.asyncMap(
        input.snapshotSkuses,
        ShoppingMallProductSnapshotSkusTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
