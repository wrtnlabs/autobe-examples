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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorCancellationRequestSnapshots(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_cancellation_request_snapshotsWhereInput =
    {
      deleted_at: null,
    };
  if (props.body.actor_type !== undefined) {
    whereInput.actor_type = props.body.actor_type;
  }
  if (props.body.search !== undefined && props.body.search.length > 0) {
    whereInput.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { body: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  if (props.body.response_status === "approved") {
    whereInput.approved_at = { not: null };
  } else if (props.body.response_status === "rejected") {
    whereInput.rejected_at = { not: null };
  }
  if (props.body.created_at_range !== null) {
    const range = props.body.created_at_range;
    const conditions: Prisma.DateTimeFilter<"ecommerce_mall_cancellation_request_snapshots"> =
      {};
    if (range?.gte !== undefined) {
      conditions.gte = range.gte;
    }
    if (range?.lte !== undefined) {
      conditions.lte = range.lte;
    }
    whereInput.created_at = conditions;
  }
  if (props.body.approved_at_range !== null) {
    const range = props.body.approved_at_range;
    const conditions: Prisma.DateTimeFilter<"ecommerce_mall_cancellation_request_snapshots"> =
      {};
    if (range?.gte !== undefined) {
      conditions.gte = range.gte;
    }
    if (range?.lte !== undefined) {
      conditions.lte = range.lte;
    }
    whereInput.approved_at = conditions;
  }
  if (props.body.rejected_at_range !== null) {
    const range = props.body.rejected_at_range;
    const conditions: Prisma.DateTimeFilter<"ecommerce_mall_cancellation_request_snapshots"> =
      {};
    if (range?.gte !== undefined) {
      conditions.gte = range.gte;
    }
    if (range?.lte !== undefined) {
      conditions.lte = range.lte;
    }
    whereInput.rejected_at = conditions;
  }
  const orderByInput: Prisma.ecommerce_mall_cancellation_request_snapshotsOrderByWithRelationInput[] =
    [{ created_at: "desc" }, { id: "desc" }];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallCancellationRequestSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
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
// export async function patchEcommerceMallSuperAdministratorCancellationRequestSnapshots(props: {
//   superAdministrator: SuperadministratorPayload;
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