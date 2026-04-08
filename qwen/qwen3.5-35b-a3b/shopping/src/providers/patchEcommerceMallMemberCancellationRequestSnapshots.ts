import { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberCancellationRequestSnapshots(props: {
  member: MemberPayload;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const cursor = props.body.cursor;
  const skip = cursor ? 1 : (page - 1) * limit;
  const whereClause: Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput =
    {
      deleted_at: null,
      actor_type: props.body.actor_type,
      ...(props.body.created_at_range && {
        created_at: {
          gte: props.body.created_at_range.gte ?? "",
          lte: props.body.created_at_range.lte ?? "",
        } satisfies Prisma.DateTimeFilter,
      }),
      ...(props.body.approved_at_range && {
        approved_at: {
          gte: props.body.approved_at_range.gte ?? "",
          lte: props.body.approved_at_range.lte ?? "",
        },
      }),
      ...(props.body.rejected_at_range && {
        rejected_at: {
          gte: props.body.rejected_at_range.gte ?? "",
          lte: props.body.rejected_at_range.lte ?? "",
        },
      }),
      ...(props.body.search && {
        OR: [
          { title: { contains: props.body.search } },
          { body: { contains: props.body.search } },
        ],
      }),
      cancellationRequest: {
        item: {
          order: {
            member: {
              id: props.member.id,
            },
          },
        },
      },
      ...(props.body.response_status === "approved" && {
        approved_at: { not: null },
      }),
      ...(props.body.response_status === "rejected" && {
        rejected_at: { not: null },
      }),
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  const orderBy: Prisma.ecommerce_mall_cancellation_request_snapshotsOrderByWithRelationInput[] =
    [{ created_at: "desc" as const }, { id: "desc" as const }];
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit + 1,
      ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereClause,
    }),
  ]);
  let data = records;
  let nextCursor: string | undefined = undefined;
  if (records.length > limit) {
    data = records.slice(0, limit);
    const lastRecord = records[records.length - 1];
    nextCursor = `${toISOStringSafe(lastRecord.created_at)}:${lastRecord.id}`;
  }
  const currentPage = cursor ? page : Math.floor(skip / limit) + 1;
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
// import { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberCancellationRequestSnapshots(props: {
//   member: MemberPayload;
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