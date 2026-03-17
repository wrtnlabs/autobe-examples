import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallShipmentCollector {
  export async function collect(props: {
    body: IEcommerceMallShipment.ICreate;
    ecommerceMallSellers: IEntity; // from authorized actor
    ecommerceMallOrderItems: IEntity; // from path parameter orderItemId (first item)
  }) {
    const id: string = v4();
    // Query first order_item to get order_id (all items belong to same order)
    const firstOrderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.ecommerceMallOrderItems.id },
      });
    const now = new Date();
    return {
      // Scalar fields
      id,
      carrier_name: props.body.carrier_name ?? null,
      carrier_phone: props.body.carrier_phone ?? null,
      carrier_website: props.body.carrier_website ?? null,
      status: "pending",
      shipped_at: null,
      delivered_at: null,
      estimated_delivery_at: null,
      delivery_address: props.body.delivery_address ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // BelongsTo relations
      seller: {
        connect: { id: props.ecommerceMallSellers.id },
      },
      order: {
        connect: { id: firstOrderItem.ecommerce_mall_order_id },
      },
      // HasMany relations
      orderItems: {
        create: await ArrayUtil.asyncMap(
          props.body.order_item_ids,
          async (orderIdItemId: string, i: number) => ({
            id: v4(),
            ecommerce_mall_shipment_id: id,
            orderItem: {
              connect: { id: orderIdItemId },
            },
            shipped_quantity: 1,
            created_at: now,
            updated_at: now,
          }),
        ),
      },
    } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
  }
}
