import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotAtSumTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        version: true,
        changed_at: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            category_id: true,
          },
        },
        category: true,
        changedBy: {
          select: {
            user_type: true,
          },
        },
        productSnapshotVariants: true,
        cartItems: true,
        orderItems: true,
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot.ISum> {
    return {
      type: "product",
      changed_at: input.changed_at.toISOString(),
      changed_by: input.changedBy.user_type as "customer" | "seller" | "admin",
      version: input.version,
      snapshot_data: {
        id: input.product.id,
        name: input.product.name,
        base_price: input.product.base_price,
        category_id: input.product.category_id,
      },
    };
  }
}
