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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformShipmentTransformer } from "../transformers/MallPlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformAdministratorShipmentsShipmentId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipment.IUpdate;
}): Promise<IMallPlatformShipment> {
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        deleted_at: true,
        mall_platform_seller_id: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
      },
    });
  if (shipment.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (
    shipment.status === "delivered" &&
    props.body.status !== undefined &&
    props.body.status !== "delivered"
  ) {
    throw new HttpException("Shipment lifecycle cannot be reopened.", 400);
  }
  if (
    shipment.status === "completed" &&
    props.body.status !== undefined &&
    props.body.status !== "completed"
  ) {
    throw new HttpException("Shipment lifecycle cannot be reopened.", 400);
  }
  if (props.body.trackingNumber !== undefined) {
    const duplicate = await MyGlobal.prisma.mall_platform_shipments.findFirst({
      where: {
        mall_platform_seller_id: shipment.mall_platform_seller_id,
        tracking_number: props.body.trackingNumber,
        deleted_at: null,
        NOT: { id: props.shipmentId },
      },
      select: { id: true },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "Tracking number must be unique within the seller scope.",
        400,
      );
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.mall_platform_shipments.update({
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
        updated_at: new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...MallPlatformShipmentTransformer.select(),
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
// export async function putMallPlatformAdministratorShipmentsShipmentId(props: {
//   administrator: AdministratorPayload;
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