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

export async function deleteMallPlatformAdministratorShipmentsShipmentIdShipmentItemsShipmentItemId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const shipmentItem = await prisma.mall_platform_shipment_items.findUnique({
      where: {
        id: props.shipmentItemId,
      },
      select: {
        id: true,
        mall_platform_shipment_id: true,
      },
    });
    if (
      shipmentItem === null ||
      shipmentItem.mall_platform_shipment_id !== props.shipmentId
    ) {
      throw new HttpException("Not Found", 404);
    }
    const shipment = await prisma.mall_platform_shipments.findUniqueOrThrow({
      where: {
        id: props.shipmentId,
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (shipment.status !== "preparing" && shipment.status !== "shipping") {
      throw new HttpException(
        "Shipment is unavailable for shipping actions",
        409,
      );
    }
    await prisma.mall_platform_shipment_items.delete({
      where: {
        id: props.shipmentItemId,
      },
    });
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
// export async function deleteMallPlatformAdministratorShipmentsShipmentIdShipmentItemsShipmentItemId(props: {
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