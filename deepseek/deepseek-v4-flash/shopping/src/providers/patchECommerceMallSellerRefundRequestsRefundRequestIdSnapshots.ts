import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/ECommerceMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSellerRefundRequestsRefundRequestIdSnapshots(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IECommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIECommerceMallRefundRequestSnapshot.ISummary> {
  // Verify seller owns this refund request and it is not soft-deleted
  const refundRequest =
    await MyGlobal.prisma.e_commerce_mall_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        e_commerce_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found or unauthorized", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Deconstruct optional filters for cleaner conditionals
  const {
    status,
    response_timestamp_from,
    response_timestamp_to,
    created_at_from,
    created_at_to,
  } = props.body;
  const hasResponseTimestampFilter =
    response_timestamp_from !== undefined ||
    response_timestamp_to !== undefined;
  const hasCreatedAtFilter =
    created_at_from !== undefined || created_at_to !== undefined;
  const whereInput = {
    e_commerce_mall_refund_request_id: props.refundRequestId,
    ...(status !== undefined && { status }),
    ...(hasResponseTimestampFilter && {
      response_timestamp: {
        ...(response_timestamp_from !== undefined && {
          gte: new Date(response_timestamp_from),
        }),
        ...(response_timestamp_to !== undefined && {
          lte: new Date(response_timestamp_to),
        }),
      },
    }),
    ...(hasCreatedAtFilter && {
      created_at: {
        ...(created_at_from !== undefined && {
          gte: new Date(created_at_from),
        }),
        ...(created_at_to !== undefined && {
          lte: new Date(created_at_to),
        }),
      },
    }),
  } satisfies Prisma.e_commerce_mall_refund_request_snapshotsWhereInput;
  const records =
    await MyGlobal.prisma.e_commerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.e_commerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallRefundRequestSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIECommerceMallRefundRequestSnapshot.ISummary;
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
// import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
// import { IPageIECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallRefundRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSellerRefundRequestsRefundRequestIdSnapshots(props: {
//   seller: SellerPayload;
//   refundRequestId: string & tags.Format<"uuid">;
//   body: IECommerceMallRefundRequestSnapshot.IRequest;
// }): Promise<IPageIECommerceMallRefundRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_refund_request_snapshots.findMany({
//     ...ECommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallRefundRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------