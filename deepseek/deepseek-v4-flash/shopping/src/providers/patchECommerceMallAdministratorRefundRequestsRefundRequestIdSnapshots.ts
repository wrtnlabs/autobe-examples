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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallRefundRequestSnapshotAtSummaryTransformer } from "../transformers/ECommerceMallRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorRefundRequestsRefundRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IECommerceMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIECommerceMallRefundRequestSnapshot.ISummary> {
  // Verify the parent refund request exists and is not soft-deleted
  await MyGlobal.prisma.e_commerce_mall_refund_requests.findUniqueOrThrow({
    where: { id: props.refundRequestId, deleted_at: null },
    select: { id: true },
  });
  // Pagination defaults
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Build dynamic WHERE clause for snapshot filters
  const whereInput: Prisma.e_commerce_mall_refund_request_snapshotsWhereInput =
    {
      e_commerce_mall_refund_request_id: props.refundRequestId,
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...((props.body.response_timestamp_from !== undefined ||
        props.body.response_timestamp_to !== undefined) && {
        response_timestamp: {
          ...(props.body.response_timestamp_from !== undefined && {
            gte: props.body.response_timestamp_from,
          }),
          ...(props.body.response_timestamp_to !== undefined && {
            lte: props.body.response_timestamp_to,
          }),
        },
      }),
      ...((props.body.created_at_from !== undefined ||
        props.body.created_at_to !== undefined) && {
        created_at: {
          ...(props.body.created_at_from !== undefined && {
            gte: props.body.created_at_from,
          }),
          ...(props.body.created_at_to !== undefined && {
            lte: props.body.created_at_to,
          }),
        },
      }),
    } satisfies Prisma.e_commerce_mall_refund_request_snapshotsWhereInput;
  // Fetch paginated snapshot records sorted by creation date descending
  const records =
    await MyGlobal.prisma.e_commerce_mall_refund_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallRefundRequestSnapshotAtSummaryTransformer.select(),
    });
  // Count total matching records
  const total: number =
    await MyGlobal.prisma.e_commerce_mall_refund_request_snapshots.count({
      where: whereInput,
    });
  // Compute total pages
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallRefundRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
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
// export async function patchECommerceMallAdministratorRefundRequestsRefundRequestIdSnapshots(props: {
//   administrator: AdministratorPayload;
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