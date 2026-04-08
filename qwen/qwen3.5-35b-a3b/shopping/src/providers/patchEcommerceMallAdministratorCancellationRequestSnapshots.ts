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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorCancellationRequestSnapshots(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput =
    {
      deleted_at: null,
      ...(props.body.actor_type !== undefined && {
        actor_type: props.body.actor_type,
      }),
      ...(props.body.approved_at_range !== undefined &&
        props.body.approved_at_range !== null && {
          approved_at: {
            ...(props.body.approved_at_range.gte && {
              gte: new Date(props.body.approved_at_range.gte),
            }),
            ...(props.body.approved_at_range.lte && {
              lte: new Date(props.body.approved_at_range.lte),
            }),
          },
        }),
      ...(props.body.created_at_range !== undefined &&
        props.body.created_at_range !== null && {
          created_at: {
            ...(props.body.created_at_range.gte && {
              gte: new Date(props.body.created_at_range.gte),
            }),
            ...(props.body.created_at_range.lte && {
              lte: new Date(props.body.created_at_range.lte),
            }),
          },
        }),
      ...(props.body.rejected_at_range !== undefined &&
        props.body.rejected_at_range !== null && {
          rejected_at: {
            ...(props.body.rejected_at_range.gte && {
              gte: new Date(props.body.rejected_at_range.gte),
            }),
            ...(props.body.rejected_at_range.lte && {
              lte: new Date(props.body.rejected_at_range.lte),
            }),
          },
        }),
      ...(props.body.response_status !== undefined &&
        props.body.response_status !== null && {
          ...{
            pending: { approved_at: null, rejected_at: null },
            approved: { approved_at: { not: null } },
            rejected: { rejected_at: { not: null } },
          }[props.body.response_status],
        }),
      ...(props.body.search !== undefined &&
        props.body.search !== null &&
        props.body.search.length > 0 && {
          OR: [
            { title: { contains: props.body.search, mode: "insensitive" } },
            { body: { contains: props.body.search, mode: "insensitive" } },
          ],
        }),
      ...(props.body.cursor !== undefined &&
        props.body.cursor !== null && {
          OR: [
            {
              created_at: { gt: new Date(props.body.cursor) },
            },
            {
              created_at: new Date(props.body.cursor),
              id: { gt: props.body.cursor },
            },
          ],
        }),
    } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput;
  const orderByInput = [
    { created_at: "desc" as const },
    { id: "desc" as const },
  ] satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsOrderByWithRelationInput[];
  const data =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany(
      {
        where: whereInput,
        orderBy: orderByInput,
        skip,
        take: limit + 1,
        ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const hasMore = data.length > limit;
  const records = hasMore ? data.slice(0, -1) : data;
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
    } satisfies IPage.IPagination,
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
// export async function patchEcommerceMallAdministratorCancellationRequestSnapshots(props: {
//   administrator: AdministratorPayload;
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