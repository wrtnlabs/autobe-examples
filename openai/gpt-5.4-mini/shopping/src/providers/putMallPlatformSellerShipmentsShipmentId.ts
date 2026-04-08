import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipment.IUpdate;
}): Promise<IMallPlatformShipment> {
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const shipment = await prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        deleted_at: true,
      },
    });
    if (shipment.deleted_at !== null) {
      throw new HttpException("Shipment not found", 404);
    }
    if (shipment.mall_platform_seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (shipment.status === "delivered" || shipment.status === "completed") {
      if (
        props.body.status !== undefined &&
        props.body.status !== shipment.status
      ) {
        throw new HttpException("Shipment is already completed", 400);
      }
      if (
        props.body.carrierName !== undefined ||
        props.body.trackingNumber !== undefined ||
        props.body.trackingUrl !== undefined
      ) {
        throw new HttpException("Shipment is already completed", 400);
      }
    }
    if (props.body.trackingNumber !== undefined) {
      const conflict = await prisma.mall_platform_shipments.findFirst({
        where: {
          deleted_at: null,
          mall_platform_seller_id: props.seller.id,
          tracking_number: props.body.trackingNumber,
          NOT: { id: props.shipmentId },
        },
        select: { id: true },
      });
      if (conflict !== null) {
        throw new HttpException(
          "Tracking number already exists for this seller",
          400,
        );
      }
    }
    const nextStatus = props.body.status ?? shipment.status;
    const shippedAt =
      nextStatus === "shipped" && shipment.shipped_at === null
        ? new Date()
        : shipment.shipped_at;
    const deliveredAt =
      nextStatus === "delivered" && shipment.delivered_at === null
        ? new Date()
        : shipment.delivered_at;
    await prisma.mall_platform_shipments.update({
      where: { id: props.shipmentId },
      data: {
        ...(props.body.carrierName !== undefined && {
          carrier_name: props.body.carrierName,
        }),
        ...(props.body.trackingNumber !== undefined && {
          tracking_number: props.body.trackingNumber,
        }),
        ...(props.body.trackingUrl !== undefined && {
          tracking_url: props.body.trackingUrl,
        }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(shippedAt !== shipment.shipped_at && { shipped_at: shippedAt }),
        ...(deliveredAt !== shipment.delivered_at && {
          delivered_at: deliveredAt,
        }),
        updated_at: new Date(),
      },
    });
    return await prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...MallPlatformShipmentTransformer.select(),
    });
  });
  return await MallPlatformShipmentTransformer.transform(updated);
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
// import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putMallPlatformSellerShipmentsShipmentId(props: {
//   seller: SellerPayload;
//   shipmentId: string & tags.Format<"uuid">;
//   body: IMallPlatformShipment.IUpdate;
// }): Promise<IMallPlatformShipment> {
//   await MyGlobal.prisma.mall_platform_shipments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformShipmentTransformer.select(),
//   });
//   return await MallPlatformShipmentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------