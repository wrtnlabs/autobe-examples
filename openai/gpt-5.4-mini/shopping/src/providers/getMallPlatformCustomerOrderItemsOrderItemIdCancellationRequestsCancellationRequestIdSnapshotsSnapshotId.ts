import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  cancellationRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformCancellationRequestSnapshot> {
  const record =
    await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          mall_platform_cancellation_request_id: props.cancellationRequestId,
        },
        select: {
          id: true,
          snapshot_status: true,
          review_result: true,
          reason: true,
          changed_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          cancellationRequest: {
            select: {
              id: true,
              mall_platform_order_item_id: true,
            },
          },
        },
      },
    );
  if (
    record.cancellationRequest.mall_platform_order_item_id !== props.orderItemId
  ) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: record.id,
    cancellationRequest: {
      id: record.cancellationRequest.id,
    } satisfies IMallPlatformCancellationRequest.ISummary,
    snapshotStatus: record.snapshot_status,
    reviewResult: record.review_result,
    reason: record.reason,
    changedAt: record.changed_at.toISOString(),
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString(),
    deletedAt: record.deleted_at?.toISOString() ?? null,
  } satisfies IMallPlatformCancellationRequestSnapshot;
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
// import { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
// import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformCustomerOrderItemsOrderItemIdCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
//   customer: CustomerPayload;
//   orderItemId: string & tags.Format<"uuid">;
//   cancellationRequestId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformCancellationRequestSnapshot> {
//   const record = await MyGlobal.prisma.mall_platform_cancellation_request_snapshots.findFirstOrThrow({
//     ...MallPlatformCancellationRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformCancellationRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------