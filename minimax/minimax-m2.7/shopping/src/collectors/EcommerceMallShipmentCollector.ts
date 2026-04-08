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
    ecommerceMallOrders: IEntity;
    ecommerceMallSellers: IEntity;
    ecommerceMallSellerSessions: IEntity;
  }) {
    const now = new Date();
    return {
      id: v4(),
      carrier: props.body.carrier,
      tracking_number: props.body.trackingNumber,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      order: { connect: { id: props.ecommerceMallOrders.id } },
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      shipmentItems: {
        create: await Promise.all(
          props.body.orderItemIds.map((orderItemId) => ({
            id: v4(),
            orderItem: { connect: { id: orderItemId } },
            created_at: now,
          })),
        ),
      },
    } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallShipmentCollector {
//         export async function collect(props: {
//           body: IEcommerceMallShipment.ICreate;
//           ecommerceMallOrders: IEntity; // from path parameter orderId
// ecommerceMallSellers: IEntity; // from authorized actor
// ecommerceMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       carrier: ...,
//       tracking_number: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       order: ...,
//       seller: ...,
//       shipmentItems: ...,
//           } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------