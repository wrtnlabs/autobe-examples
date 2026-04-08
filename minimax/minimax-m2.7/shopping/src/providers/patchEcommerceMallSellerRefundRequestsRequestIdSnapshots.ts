import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRefundRequestsRequestIdSnapshots(props: {
  seller: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "seller";
  };
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
  // Verify refund request exists and belongs to this seller
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting parameters
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Build where clause
  const whereClause: Prisma.ecommerce_mall_refund_request_snapshotsWhereInput =
    {
      ecommerce_mall_refund_request_id: props.requestId,
      ...(props.body.snapshotStatus && {
        snapshot_status: props.body.snapshotStatus,
      }),
      ...(props.body.sellerResponse && {
        seller_response: props.body.sellerResponse,
      }),
    };
  // Build orderBy clause
  const orderByInput: Prisma.ecommerce_mall_refund_request_snapshotsOrderByWithRelationInput =
    {
      [sortBy]: sortOrder,
    };
  // Query snapshots with pagination
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const totalRecords =
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.count({
      where: whereClause,
    });
  const totalPages = Math.ceil(totalRecords / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
      EcommerceMallRefundRequestSnapshotAtSummaryTransformer.transform,
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
// import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
// import { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerRefundRequestsRequestIdSnapshots(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallRefundRequestSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallRefundRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.findMany({
//     ...EcommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallRefundRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------