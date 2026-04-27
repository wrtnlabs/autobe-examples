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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/ECommerceMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallCustomerRefundRequestsRefundRequestIdSnapshots(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IECommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIECommerceMallRefundRequestSnapshot.ISummary> {
  // ----
  // AUTHORIZATION
  // ----
  await MyGlobal.prisma.e_commerce_mall_refund_requests.findFirstOrThrow({
    where: {
      id: props.refundRequestId,
      e_commerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // ----
  // PAGINATION DEFAULTS
  // ----
  const page: number = props.body.page ?? 1;
  const limit: number = Math.min(props.body.limit ?? 100, 100);
  const skip: number = (page - 1) * limit;
  // ----
  // BUILD WHERE CLAUSE
  // ----
  const where: Prisma.e_commerce_mall_refund_request_snapshotsWhereInput = {
    e_commerce_mall_refund_request_id: props.refundRequestId,
    refundRequest: {
      deleted_at: null,
    } satisfies Prisma.e_commerce_mall_refund_requestsWhereInput,
  };
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  if (
    props.body.response_timestamp_from !== undefined ||
    props.body.response_timestamp_to !== undefined
  ) {
    const responseTimestampFilter: Prisma.DateTimeFilter = {};
    if (props.body.response_timestamp_from !== undefined) {
      responseTimestampFilter.gte = props.body.response_timestamp_from;
    }
    if (props.body.response_timestamp_to !== undefined) {
      responseTimestampFilter.lte = props.body.response_timestamp_to;
    }
    where.response_timestamp = responseTimestampFilter;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_from !== undefined) {
      createdAtFilter.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to !== undefined) {
      createdAtFilter.lte = props.body.created_at_to;
    }
    where.created_at = createdAtFilter;
  }
  // ----
  // QUERY
  // ----
  const snapshots =
    await MyGlobal.prisma.e_commerce_mall_refund_request_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      } satisfies Prisma.e_commerce_mall_refund_request_snapshotsOrderByWithRelationInput,
      ...ECommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.e_commerce_mall_refund_request_snapshots.count({
      where,
    });
  // ----
  // RESPONSE
  // ----
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
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
// export async function patchECommerceMallCustomerRefundRequestsRefundRequestIdSnapshots(props: {
//   customer: CustomerPayload;
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