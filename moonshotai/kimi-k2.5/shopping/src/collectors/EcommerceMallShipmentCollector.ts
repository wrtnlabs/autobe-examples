import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date): string {
  return date.toISOString();
}
export namespace EcommerceMallShipmentCollector {
  export async function collect(props: {
    body: IEcommerceMallShipment.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    // Indirect reference: get order_id from the first order item
    const firstOrderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.body.orderItemIds[0] },
      });
    const stringNow = toISOStringSafe(now);
    const shipmentItemsCreate = props.body.orderItemIds.map(
      (
        orderItemId,
      ): Prisma.ecommerce_mall_shipment_itemsCreateWithoutShipmentInput => ({
        id: v4(),
        orderItem: { connect: { id: orderItemId } },
        created_at: stringNow,
      }),
    );
    return {
      id,
      carrier_name: props.body.carrierName,
      tracking_number: props.body.trackingNumber,
      shipped_at: stringNow,
      created_at: stringNow,
      updated_at: stringNow,
      deleted_at: null,
      // BelongsTo relations
      seller: { connect: { id: props.seller.id } },
      order: { connect: { id: firstOrderItem.order_id } },
      // HasMany: shipment items (junction table)
      shipmentItems: {
        create: shipmentItemsCreate,
      },
      // HasOne: delivery - not created initially
      delivery: undefined,
    } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
  }
}
