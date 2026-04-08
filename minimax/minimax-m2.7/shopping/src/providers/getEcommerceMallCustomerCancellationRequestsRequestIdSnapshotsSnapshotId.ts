import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCancellationRequestSnapshotTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCancellationRequestsRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequestSnapshot> {
  // Query cancellation request to verify ownership
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
      },
    });
  if (!cancellationRequest) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Verify the customer owns this cancellation request
  if (cancellationRequest.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the snapshot - findFirstOrThrow will handle 404 if not found
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          ecommerce_mall_cancellation_request_id: props.requestId,
        },
        ...EcommerceMallCancellationRequestSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallCancellationRequestSnapshotTransformer.transform(
    snapshot,
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
// import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCancellationRequestsRequestIdSnapshotsSnapshotId(props: {
//   customer: CustomerPayload;
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