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

export async function deleteMallPlatformSellerShipmentsShipmentIdItemsShipmentItemId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        status: true,
      },
    });
  if (shipment.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (shipment.status !== "preparing") {
    throw new HttpException("Shipment is locked", 409);
  }
  const shipmentItem =
    await MyGlobal.prisma.mall_platform_shipment_items.findFirstOrThrow({
      where: {
        id: props.shipmentItemId,
        mall_platform_shipment_id: props.shipmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        mall_platform_shipment_id: true,
      },
    });
  const remaining = await MyGlobal.prisma.mall_platform_shipment_items.count({
    where: {
      mall_platform_shipment_id: shipmentItem.mall_platform_shipment_id,
      deleted_at: null,
      NOT: {
        id: shipmentItem.id,
      },
    },
  });
  if (remaining === 0) {
    throw new HttpException("Shipment cannot be empty", 409);
  }
  await MyGlobal.prisma.mall_platform_shipment_items.delete({
    where: {
      id: shipmentItem.id,
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
// export async function deleteMallPlatformSellerShipmentsShipmentIdItemsShipmentItemId(props: {
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