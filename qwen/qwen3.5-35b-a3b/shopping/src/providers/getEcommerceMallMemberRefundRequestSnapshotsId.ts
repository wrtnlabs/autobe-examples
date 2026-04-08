import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallRefundRequestSnapshotTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallMemberRefundRequestSnapshotsId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRefundRequestSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.id },
        select: {
          id: true,
          refund_request_id: true,
          order_item_id: true,
          status: true,
          reason: true,
          created_at: true,
          responded_at: true,
          approved_by_seller_id: true,
          rejection_reason: true,
          snapshot_at: true,
          deleted_at: true,
          refundRequest: { select: { id: true } },
        },
      },
    );
  const memberIsCustomer =
    await MyGlobal.prisma.ecommerce_mall_members.findUnique({
      where: { id: props.member.id, deleted_at: null },
      select: { id: true },
    });
  if (memberIsCustomer !== null) {
    throw new HttpException("Forbidden", 403);
  } else {
    const memberIsSeller =
      await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
        where: { id: props.member.id, deleted_at: null },
        select: { id: true },
      });
    if (memberIsSeller === null) {
      throw new HttpException("Forbidden", 403);
    }
    const canView = snapshot.approved_by_seller_id === props.member.id;
    if (!canView) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const transformed =
    await EcommerceMallRefundRequestSnapshotTransformer.transform(snapshot);
  return transformed;
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
// import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallMemberRefundRequestSnapshotsId(props: {
//   member: MemberPayload;
//   id: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallRefundRequestSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallRefundRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallRefundRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------