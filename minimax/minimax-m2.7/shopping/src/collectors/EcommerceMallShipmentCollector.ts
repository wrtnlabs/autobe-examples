import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

const toISOStringSafe = (date: Date): string => date.toISOString();
export namespace EcommerceMallShipmentCollector {
  export async function collect(props: {
    body: IEcommerceMallShipment.ICreate;
    ecommerceMallSellers: IEntity;
    ecommerceMallSellerSessions: IEntity;
  }) {
    const id: string = v4();
    const shipmentItems: Prisma.ecommerce_mall_shipment_itemsCreateWithoutShipmentInput[] =
      await ArrayUtil.asyncMap(
        props.body.orderItemIds,
        async (orderItemId) => ({
          id: v4(),
          orderItem: {
            connect: { id: orderItemId satisfies string as string },
          },
          created_at: new Date(),
        }),
      );
    return {
      // Scalar fields
      id,
      carrier: props.body.carrier,
      tracking_number: props.body.trackingNumber,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      order: { connect: { id: props.body.orderId satisfies string as string } },
      seller: {
        connect: {
          id: props.ecommerceMallSellers.id satisfies string as string,
        },
      },
      // HasMany - Junction records for shipment items
      shipmentItems: {
        create: shipmentItems,
      },
    } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
  }
}
