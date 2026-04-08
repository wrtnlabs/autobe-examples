import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
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

export async function getEcommerceMallSellerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  refundRequestId: string;
  snapshotId: string;
}): Promise<IEcommerceMallRefundRequestSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          refund_request_id: props.refundRequestId,
        },
        select: {
          id: true,
          refund_request_id: true,
          reason: true,
          status: true,
          response_reason: true,
          created_at: true,
        } satisfies Prisma.ecommerce_mall_refund_request_snapshotsSelect,
      },
    );
  return {
    id: record.id,
    refundRequestId: record.refund_request_id,
    reason: record.reason,
    status: record.status,
    responseReason: record.response_reason,
    createdAt: record.created_at.toISOString(),
  } satisfies IEcommerceMallRefundRequestSnapshot;
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
//   seller: SellerPayload;
//   refundRequestId: string;
//   snapshotId: string;
// }): Promise<IEcommerceMallRefundRequestSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallRefundRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallRefundRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------