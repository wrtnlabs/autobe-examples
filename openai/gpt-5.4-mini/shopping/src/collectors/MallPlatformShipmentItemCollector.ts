import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformShipmentItemCollector {
  export async function collect(props: {
    body: IMallPlatformShipmentItem.ICreate;
    shipment: IEntity;
    orderItem: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shipment: { connect: { id: props.shipment.id } },
      orderItem: { connect: { id: props.orderItem.id } },
    } satisfies Prisma.mall_platform_shipment_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformShipmentItemCollector {
//         export async function collect(props: {
//           body: IMallPlatformShipmentItem.ICreate;
//           mallPlatformShipments: IEntity; // from path parameter shipmentId
//           
//           
//         }) {
//           return {
//       id: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       shipment: ...,
//       orderItem: ...,
//           } satisfies Prisma.mall_platform_shipment_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------