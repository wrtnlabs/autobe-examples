import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMallPlatformSellerShipmentsShipmentIdShipmentItemsShipmentItemId(props: {
  seller: SellerPayload;
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
    const shipment = await prisma.mall_platform_shipments.findUnique({
      where: {
        id: props.shipmentId,
      },
      select: {
        id: true,
        mall_platform_seller_id: true,
        status: true,
      },
    });
    if (shipment === null) {
      throw new HttpException("Not Found", 404);
    }
    if (shipment.mall_platform_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (
      shipment.status === "delivered" ||
      shipment.status === "cancelled" ||
      shipment.status === "completed"
    ) {
      throw new HttpException("Forbidden", 403);
    }
    await prisma.mall_platform_shipment_items.delete({
      where: {
        id: shipmentItem.id,
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
// export async function deleteMallPlatformSellerShipmentsShipmentIdShipmentItemsShipmentItemId(props: {
//   seller: SellerPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   shipmentItemId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------