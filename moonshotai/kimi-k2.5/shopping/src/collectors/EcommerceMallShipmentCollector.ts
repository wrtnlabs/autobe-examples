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
    // Indirect reference: Query the first order item to get its order_id
    const firstOrderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.body.orderItemIds[0] },
      });
    return {
      id: v4(),
      carrier_name: props.body.carrierName,
      tracking_number: props.body.trackingNumber,
      shipped_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      order: { connect: { id: firstOrderItem.order_id } },
    } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallShipmentCollector {
//         export async function collect(props: {
//           body: IEcommerceMallShipment.ICreate;
//           ecommerceMallSellers: IEntity; // from authorized actor
// ecommerceMallOrders: IEntity; // from order item orderId
//           
//           
//         }) {
//           return {
//       id: ...,
//       carrier_name: ...,
//       tracking_number: ...,
//       shipped_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       seller: ...,
//       order: ...,
//       shipmentItems: ...,
//       delivery: ...,
//           } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------