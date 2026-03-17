import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotSkusTransformer } from "./ShoppingMallProductSnapshotSkusTransformer";
import { ShoppingMallProductSnapshotTransformer } from "./ShoppingMallProductSnapshotTransformer";
import { ShoppingMallSellerProfileSnapshotTransformer } from "./ShoppingMallSellerProfileSnapshotTransformer";

export namespace ShoppingMallOrderItemSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        productSnapshot: ShoppingMallProductSnapshotTransformer.select(),
        productSnapshotSku: ShoppingMallProductSnapshotSkusTransformer.select(),
        sellerProfileSnapshot:
          ShoppingMallSellerProfileSnapshotTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot> {
    return {
      id: input.id,
      productSnapshot: await ShoppingMallProductSnapshotTransformer.transform(
        input.productSnapshot,
      ),
      productSnapshotSku:
        await ShoppingMallProductSnapshotSkusTransformer.transform(
          input.productSnapshotSku,
        ),
      sellerProfileSnapshot:
        await ShoppingMallSellerProfileSnapshotTransformer.transform(
          input.sellerProfileSnapshot,
        ),
      created_at: input.created_at.toISOString(),
    };
  }
}
