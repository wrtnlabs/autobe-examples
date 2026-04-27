import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallShipmentCollector {
  export async function collect(props: {
    body: IECommerceMallShipment.ICreate;
    eCommerceMallSellers: IEntity;
    eCommerceMallSellerSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      carrier_name: props.body.carrierName,
      tracking_number: props.body.trackingNumber,
      shipped_at: new Date(),
      delivered_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.eCommerceMallSellers.id } },
      shipmentItems: props.body.orderItemIds.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.orderItemIds,
              async (orderItemId) => ({
                id: v4(),
                orderItem: { connect: { id: orderItemId } },
                created_at: new Date(),
                updated_at: new Date(),
              }),
            ),
          }
        : undefined,
    } satisfies Prisma.e_commerce_mall_shipmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallShipmentCollector {
//         export async function collect(props: {
//           body: IECommerceMallShipment.ICreate;
//           eCommerceMallSellers: IEntity; // from authorized actor
// eCommerceMallSellerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       carrier_name: ...,
//       tracking_number: ...,
//       shipped_at: ...,
//       delivered_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       seller: ...,
//       shipmentItems: ...,
//           } satisfies Prisma.e_commerce_mall_shipmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------