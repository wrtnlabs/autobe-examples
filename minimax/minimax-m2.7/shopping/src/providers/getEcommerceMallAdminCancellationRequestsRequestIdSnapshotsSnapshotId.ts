import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminCancellationRequestsRequestIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequestSnapshot> {
  // Verify the parent cancellation request exists
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow({
    where: { id: props.requestId },
    select: { id: true },
  });
  // Query the snapshot with composite key verification
  const record =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          ecommerce_mall_cancellation_request_id: props.requestId,
        },
        select: {
          id: true,
          ecommerce_mall_cancellation_request_id: true,
          reason: true,
          status: true,
          created_at: true,
        },
      },
    );
  // Transform to DTO
  return {
    id: record.id as string & tags.Format<"uuid">,
    cancellationRequestId:
      record.ecommerce_mall_cancellation_request_id as string &
        tags.Format<"uuid">,
    reason: record.reason,
    status: record.status,
    createdAt: record.created_at.toISOString() as string &
      tags.Format<"date-time">,
  };
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
// import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminCancellationRequestsRequestIdSnapshotsSnapshotId(props: {
//   admin: AdminPayload;
//   requestId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallCancellationRequestSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallCancellationRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCancellationRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------