import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { MallPlatformShipmentItemCollector } from "./MallPlatformShipmentItemCollector";

export namespace MallPlatformShipmentCollector {
  export async function collect(props: {
    body: IMallPlatformShipment.ICreate;
    seller: IEntity;
    order: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      carrier_name: props.body.carrierName,
      tracking_number: props.body.trackingNumber,
      tracking_url: null,
      status: "preparing",
      shipped_at: null,
      delivered_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
      order: { connect: { id: props.order.id } },
      shipmentItems: props.body.shipmentItems.length
        ? {
            create: await ArrayUtil.asyncMap(props.body.shipmentItems, (item) =>
              MallPlatformShipmentItemCollector.collect({
                body: item,
                shipment: props.seller,
                orderItem: props.order,
              }),
            ),
          }
        : undefined,
    } satisfies Prisma.mall_platform_shipmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformShipmentCollector {
//         export async function collect(props: {
//           body: IMallPlatformShipment.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       carrier_name: ...,
//       tracking_number: ...,
//       tracking_url: ...,
//       status: ...,
//       shipped_at: ...,
//       delivered_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       seller: ...,
//       order: ...,
//       shipmentItems: ...,
//           } satisfies Prisma.mall_platform_shipmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------