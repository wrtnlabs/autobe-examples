import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotAtSTransformer {
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
            name: true,
            description: true,
            base_price: true,
          },
        },
        category: {
          select: {
            id: true,
          },
        },
        changedBy: {
          select: {
            id: true,
          },
        },
        productSnapshotVariants: {
          select: {
            id: true,
          },
        },
        cartItems: {
          select: {
            id: true,
          },
        },
        orderItems: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot.IS> {
    return {
      version: input.version,
      changed_at: input.changed_at.toISOString(),
      category_id: input.category.id,
      changed_by_id: input.changedBy.id,
      name: input.product.name,
      description: input.product.description,
      base_price: input.product.base_price,
    };
  }
}
