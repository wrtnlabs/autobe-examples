import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallShipmentCollector {
  export async function collect(props: {
    body: IShoppingMallShipment.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    // Query first order item to get the order_id (all items belong to same order)
    const firstOrderItem =
      await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
        where: { id: props.body.order_item_ids[0] },
      });
    const shippedAt = new Date();
    const autoDeliveredAt = new Date(
      shippedAt.getTime() + 14 * 24 * 60 * 60 * 1000,
    );
    return {
      // Scalar fields
      id,
      tracking_carrier: props.body.tracking_carrier ?? null,
      tracking_number: props.body.tracking_number ?? null,
      shipped_at: shippedAt,
      delivered_at: null,
      delivery_confirmed_at: null,
      auto_delivered_at: autoDeliveredAt,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations - use connect syntax, NOT FK column
      order: { connect: { id: firstOrderItem.shopping_mall_order_id } },
      // HasMany relations - create shipment items
      items: {
        create: props.body.order_item_ids.map((orderItemId) => ({
          id: v4(),
          orderItem: { connect: { id: orderItemId } },
          created_at: new Date(),
          updated_at: new Date(),
        })),
      },
    } satisfies Prisma.shopping_mall_shipmentsCreateInput;
  }
}
