import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMallPlatformAdministratorShipmentsShipmentIdItemsShipmentItemId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
      },
      select: {
        id: true,
      },
    });
  const shipmentItem =
    await MyGlobal.prisma.mall_platform_shipment_items.findUnique({
      where: {
        id: props.shipmentItemId,
      },
      select: {
        id: true,
        mall_platform_shipment_id: true,
      },
    });
  if (shipmentItem === null) {
    throw new HttpException("Shipment item not found", 404);
  }
  if (shipmentItem.mall_platform_shipment_id !== shipment.id) {
    throw new HttpException("Shipment item does not belong to shipment", 404);
  }
  await MyGlobal.prisma.mall_platform_shipment_items.delete({
    where: {
      id: props.shipmentItemId,
    },
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteMallPlatformAdministratorShipmentsShipmentIdItemsShipmentItemId(props: {
//   administrator: AdministratorPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   shipmentItemId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------