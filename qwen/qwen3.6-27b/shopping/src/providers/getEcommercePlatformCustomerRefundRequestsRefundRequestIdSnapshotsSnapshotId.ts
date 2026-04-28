import { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformSnapshotRefundRequestTransformer } from "../transformers/EcommercePlatformSnapshotRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformCustomerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformSnapshotRefundRequest> {
  const record =
    await MyGlobal.prisma.ecommerce_platform_snapshot_refund_requests.findFirstOrThrow(
      {
        ...EcommercePlatformSnapshotRefundRequestTransformer.select(),
        where: {
          id: props.snapshotId,
          ecommerce_platform_refund_requests_id: props.refundRequestId,
        },
      },
    );
  return await EcommercePlatformSnapshotRefundRequestTransformer.transform(
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
// import { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformCustomerRefundRequestsRefundRequestIdSnapshotsSnapshotId(props: {
//   customer: CustomerPayload;
//   refundRequestId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformSnapshotRefundRequest> {
//   const record = await MyGlobal.prisma.ecommerce_platform_snapshot_refund_requests.findFirstOrThrow({
//     ...EcommercePlatformSnapshotRefundRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformSnapshotRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------