import { IEcommerceMallShipmentDeliveryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDeliveryStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallShipmentDeliveryStatusTransformer } from "../transformers/EcommerceMallShipmentDeliveryStatusTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallMemberShipmentsShipmentIdDeliveryStatus(props: {
  member: MemberPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentDeliveryStatus> {
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
      ...EcommerceMallShipmentDeliveryStatusTransformer.select(),
      where: { id: props.shipmentId },
    });
  const hasAccess = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: {
        in: shipment.shipmentItems.map((item) => item.id),
      },
      order: {
        member: {
          id: props.member.id,
        },
      },
    },
  });
  if (!hasAccess) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallShipmentDeliveryStatusTransformer.transform(
    shipment,
  );
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
// import { IEcommerceMallShipmentDeliveryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDeliveryStatus";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallMemberShipmentsShipmentIdDeliveryStatus(props: {
//   member: MemberPayload;
//   shipmentId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallShipmentDeliveryStatus> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
//     ...EcommerceMallShipmentDeliveryStatusTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShipmentDeliveryStatusTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------