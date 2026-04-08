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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerCancellationRequestsCancellationRequestIdSnapshots(props: {
  seller: SellerPayload;
  cancellationRequestId: string;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  // Verify seller has access to this cancellation request
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          order_item: {
            select: {
              seller_id: true,
            },
          },
        },
      },
    );
  if (cancellationRequest.order_item.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where clause with optional filters
  const whereInput: Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput =
    {
      cancellation_request_id: props.cancellationRequestId,
    };
  if (props.body.statusBefore !== null) {
    whereInput.status_before = props.body.statusBefore;
  }
  if (props.body.statusAfter !== null) {
    whereInput.status_after = props.body.statusAfter;
  }
  if (props.body.createdAtFrom !== null || props.body.createdAtTo !== null) {
    whereInput.created_at = {};
    if (props.body.createdAtFrom !== null) {
      whereInput.created_at.gte = new Date(props.body.createdAtFrom);
    }
    if (props.body.createdAtTo !== null) {
      whereInput.created_at.lte = new Date(props.body.createdAtTo);
    }
  }
  // Determine sort order
  const orderByInput: Prisma.ecommerce_mall_cancellation_request_snapshotsOrderByWithRelationInput =
    {
      created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
    };
  // Fetch records with pagination
  const records =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  // Count total records for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.transform,
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
// import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
// import { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerCancellationRequestsCancellationRequestIdSnapshots(props: {
//   seller: SellerPayload;
//   cancellationRequestId: string;
//   body: IEcommerceMallCancellationRequestSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany({
//     ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------