import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallShipmentAtSummaryTransformer } from "../transformers/EcommerceMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallMemberOrdersOrderIdShipments(props: {
  member: MemberPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipment.ISummary[]> {
  // Verify order exists and belongs to the authenticated member
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      ecommerce_mall_member_id: true,
    },
  });
  if (order.ecommerce_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query all non-deleted shipments for the order, sorted by most recent first
  const shipments = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: {
      order_id: props.orderId,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" as const },
    ...EcommerceMallShipmentAtSummaryTransformer.select(),
  });
  // Transform each shipment using the transformer
  return await ArrayUtil.asyncMap(
    shipments,
    EcommerceMallShipmentAtSummaryTransformer.transform,
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
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallMemberOrdersOrderIdShipments(props: {
//   member: MemberPayload;
//   orderId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallShipment.ISummary> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
//     ...EcommerceMallShipmentAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShipmentAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------