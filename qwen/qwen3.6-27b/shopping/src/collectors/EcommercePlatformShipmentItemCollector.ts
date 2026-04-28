import { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformShipmentItemCollector {
  export async function collect(props: {
    body: IEcommercePlatformShipmentItem.ICreate;
    ecommercePlatformShipments: IEntity;
    orderItem: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      shipment: { connect: { id: props.ecommercePlatformShipments.id } },
      orderItem: { connect: { id: props.orderItem.id } },
    } satisfies Prisma.ecommerce_platform_shipment_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformShipmentItemCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformShipmentItem.ICreate;
//           ecommercePlatformShipments: IEntity; // from path parameter shipmentId
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       updated_at: ...,
//       shipment: ...,
//       orderItem: ...,
//           } satisfies Prisma.ecommerce_platform_shipment_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------