import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformShipmentCollector {
  export async function collect(props: {
    body: IEcommercePlatformShipment.ICreate;
    ecommercePlatformSellers: IEntity;
  }) {
    const id = v4();
    return {
      id,
      carrier_name: props.body.carrierName,
      tracking_number: props.body.trackingNumber,
      shipped_at: new Date(),
      confirmed_at: null,
      delivered_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.ecommercePlatformSellers.id } },
      shipmentItems: {
        create: await ArrayUtil.asyncMap(
          props.body.orderItemIds,
          async (orderItemId) => ({
            id: v4(),
            orderItem: { connect: { id: orderItemId } },
            created_at: new Date(),
            updated_at: new Date(),
          }),
        ),
      },
    } satisfies Prisma.ecommerce_platform_shipmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformShipmentCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformShipment.ICreate;
//           ecommercePlatformSellers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       carrier_name: ...,
//       tracking_number: ...,
//       shipped_at: ...,
//       confirmed_at: ...,
//       delivered_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       seller: ...,
//       shipmentItems: ...,
//           } satisfies Prisma.ecommerce_platform_shipmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------