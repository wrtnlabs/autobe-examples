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
    ecommerceMallSellers: IEntity;
  }) {
    const id: string = v4();
    // Query first order item to derive the order
    const firstOrderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.body.order_item_ids[0] },
      });
    return {
      // Scalar fields
      id,
      carrier_name: props.body.carrier_name,
      carrier_phone: props.body.carrier_phone ?? null,
      carrier_website: props.body.carrier_website ?? null,
      status: "pending",
      shipped_at: null,
      delivered_at: null,
      estimated_delivery_at: null,
      delivery_address: props.body.delivery_address ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      // BelongsTo relations
      order: { connect: { id: firstOrderItem.ecommerce_mall_order_id } },
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      // HasMany relations (orderItems—order items already exist, just link them)
      orderItems: {
        connect: props.body.order_item_ids.map((itemId) => ({ id: itemId })),
      },
    } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
  }
}
