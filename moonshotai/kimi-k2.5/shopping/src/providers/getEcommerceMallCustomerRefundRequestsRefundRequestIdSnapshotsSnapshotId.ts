import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestSnapshotTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  refundRequestId: string;
  snapshotId: string;
}): Promise<IEcommerceMallRefundRequestSnapshot> {
  // Verify refund request exists and belongs to the authenticated customer
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: { customer_id: true },
    });
  if (refundRequest.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the snapshot ensuring it belongs to the specified refund request
  const record =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallRefundRequestSnapshotTransformer.select(),
        where: {
          id: props.snapshotId,
          refund_request_id: props.refundRequestId,
        },
      },
    );
  return EcommerceMallRefundRequestSnapshotTransformer.transform(record);
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
// export async function getEcommerceMallCustomerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
//   customer: CustomerPayload;
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