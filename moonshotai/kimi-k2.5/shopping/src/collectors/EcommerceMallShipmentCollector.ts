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
    const id = v4();
    const firstOrderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.body.orderItemIds[0] },
      });
    const shipmentItemsData: Prisma.ecommerce_mall_shipment_itemsCreateWithoutShipmentInput[] =
      await ArrayUtil.asyncMap(
        props.body.orderItemIds,
        async (orderItemId: string, sequence: number) => ({
          id: v4(),
          orderItem: {
            connect: { id: orderItemId },
          },
          sequence,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        }),
      );
    return {
      id,
      carrier_name: props.body.carrierName,
      tracking_number: props.body.trackingNumber,
      shipped_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      order: { connect: { id: firstOrderItem.order_id } },
      shipmentItems: {
        create: shipmentItemsData,
      },
    } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
  }
}
