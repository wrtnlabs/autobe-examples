import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
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

export async function getEcommerceMallCustomerCustomersMeCancellationRequestsRequestIdSnapshots(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot> {
  // Verify the cancellation request exists and belongs to the authenticated customer
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          ecommerce_mall_customer_id: true,
        },
      },
    );
  // Ownership validation: only the customer who created the request can view its snapshots
  if (cancellationRequest.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Pagination parameters
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Query snapshots ordered by created_at descending (most recent first)
  const records =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: { ecommerce_mall_cancellation_request_id: props.requestId },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        ...EcommerceMallCancellationRequestSnapshotTransformer.select(),
      },
    );
  // Count total records for pagination metadata
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: { ecommerce_mall_cancellation_request_id: props.requestId },
    });
  // Build pagination metadata with proper typing
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallCancellationRequestSnapshotTransformer.transform,
    ),
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
// import { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCustomersMeCancellationRequestsRequestIdSnapshots(props: {
//   customer: CustomerPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IPageIEcommerceMallCancellationRequestSnapshot> {
//   const records = await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany({
//     ...EcommerceMallCancellationRequestSnapshotTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCancellationRequestSnapshotTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------