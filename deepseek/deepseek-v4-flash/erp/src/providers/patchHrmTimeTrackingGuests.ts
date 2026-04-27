import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingGuestAtSummaryTransformer } from "../transformers/HrmTimeTrackingGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingGuests(props: {
  body: IHrmTimeTrackingGuest.IRequest;
}): Promise<IPageIHrmTimeTrackingGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_time_tracking_guestsWhereInput = {};
  if (!props.body.includeSoftDeleted) {
    where.deleted_at = null;
  }
  if (props.body.search) {
    where.device_fingerprint = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.created_at_from || props.body.created_at_to) {
    where.created_at = {};
    if (props.body.created_at_from) {
      where.created_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to) {
      where.created_at.lte = props.body.created_at_to;
    }
  }
  const sortField = props.body.sort ?? "created_at";
  const sortDirection = props.body.direction ?? "desc";
  const orderByInput = (
    sortField === "device_fingerprint"
      ? { device_fingerprint: sortDirection }
      : { created_at: sortDirection }
  ) satisfies Prisma.hrm_time_tracking_guestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrm_time_tracking_guests.findMany({
    where,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmTimeTrackingGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_guests.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingGuestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
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
// import { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
// import { IPageIHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingGuest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingGuests(props: {
//   body: IHrmTimeTrackingGuest.IRequest;
// }): Promise<IPageIHrmTimeTrackingGuest.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_guests.findMany({
//     ...HrmTimeTrackingGuestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingGuestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------