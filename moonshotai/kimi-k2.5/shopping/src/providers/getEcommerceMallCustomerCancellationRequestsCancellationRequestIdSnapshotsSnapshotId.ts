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

export async function getEcommerceMallCustomerCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequestSnapshot> {
  // First, verify the cancellation request exists and belongs to this customer
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow({
    where: {
      id: props.cancellationRequestId,
      orderItem: {
        order: {
          customer_id: props.customer.id,
        },
      },
    },
    select: { id: true },
  });
  // Then retrieve the snapshot
  const record =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallCancellationRequestSnapshotTransformer.select(),
        where: {
          id: props.snapshotId,
          cancellation_request_id: props.cancellationRequestId,
        },
      },
    );
  return await EcommerceMallCancellationRequestSnapshotTransformer.transform(
    record,
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
// export async function getEcommerceMallCustomerCancellationRequestsCancellationRequestIdSnapshotsSnapshotId(props: {
//   customer: CustomerPayload;
//   cancellationRequestId: string;
//   snapshotId: string;
// }): Promise<IEcommerceMallCancellationRequestSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findFirstOrThrow({
//     ...EcommerceMallCancellationRequestSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCancellationRequestSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------