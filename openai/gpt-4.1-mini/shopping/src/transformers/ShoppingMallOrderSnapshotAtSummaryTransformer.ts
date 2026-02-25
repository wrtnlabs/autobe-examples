import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_order_id: true,
        snapshot_at: true,
        status: true,
        total_price: true,
        customer_name: true,
        customer_email: true,
        shipping_address: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: { select: { id: true } },
      },
    } satisfies Prisma.shopping_mall_order_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderSnapshot.ISummary> {
    return {
      id: input.id,
      shoppingMallOrderId: input.shopping_mall_order_id,
      snapshotAt: input.snapshot_at.toISOString(),
      status: input.status,
      totalPrice: input.total_price,
      customerName: input.customer_name,
      customerEmail: input.customer_email,
      shippingAddress: input.shipping_address,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
