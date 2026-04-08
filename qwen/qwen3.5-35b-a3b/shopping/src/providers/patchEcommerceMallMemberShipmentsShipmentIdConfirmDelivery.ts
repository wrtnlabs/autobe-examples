import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallShipmentTransformer } from "../transformers/EcommerceMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberShipmentsShipmentIdConfirmDelivery(props: {
  member: MemberPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipment> {
  const shipmentIdStr = props.shipmentId satisfies string as string;
  const record =
    await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
      ...EcommerceMallShipmentTransformer.select(),
      where: {
        id: shipmentIdStr,
        deleted_at: null,
      },
    });
  if (record.status !== "shipped") {
    throw new HttpException("Shipment is not in shipped status", 400);
  }
  if (record.delivered_at !== null) {
    throw new HttpException("Shipment is already delivered", 409);
  }
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: {
      id: record.order_id,
      deleted_at: null,
    },
    select: {
      ecommerce_mall_member_id: true,
    },
  });
  if (order.ecommerce_mall_member_id !== props.member.id) {
    throw new HttpException("Customer does not own this order", 403);
  }
  await MyGlobal.prisma.ecommerce_mall_shipments.update({
    where: { id: shipmentIdStr },
    data: {
      status: "delivered",
      delivered_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.ecommerce_mall_shipment_items.updateMany({
    where: { shipment: { id: shipmentIdStr } },
    data: {
      status: "delivered",
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: shipmentIdStr },
      ...EcommerceMallShipmentTransformer.select(),
    });
  return await EcommerceMallShipmentTransformer.transform(updated);
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
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberShipmentsShipmentIdConfirmDelivery(props: {
//   member: MemberPayload;
//   shipmentId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallShipment> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
//     ...EcommerceMallShipmentTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------