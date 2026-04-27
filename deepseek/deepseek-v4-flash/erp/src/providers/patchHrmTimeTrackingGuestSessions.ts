import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmTimeTrackingMemberSessionAtSummaryTransformer } from "../transformers/HrmTimeTrackingMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingGuestSessions(props: {
  guest: GuestPayload;
  body: IHrmTimeTrackingMemberSession.IRequest;
}): Promise<IPageIHrmTimeTrackingMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause — filter by authenticated guest and exclude expired sessions
  const where: Prisma.hrm_time_tracking_member_sessionsWhereInput = {
    hrm_time_tracking_member_id: props.guest.id,
    expired_at: { gt: new Date().toISOString() },
  };
  // General search: OR across ip, href, referrer
  if (props.body.search !== undefined) {
    where.OR = [
      { ip: { contains: props.body.search, mode: "insensitive" } },
      { href: { contains: props.body.search, mode: "insensitive" } },
      { referrer: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Individual field filters (independent of search — uses AND)
  if (props.body.ip !== undefined) {
    where.ip = { contains: props.body.ip, mode: "insensitive" };
  }
  if (props.body.href !== undefined) {
    where.href = { contains: props.body.href, mode: "insensitive" };
  }
  if (props.body.referrer !== undefined) {
    where.referrer = { contains: props.body.referrer, mode: "insensitive" };
  }
  // Date range filter on created_at (from/to)
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
  // Parse sort field and direction — no `as` assertions
  const sortField = (() => {
    if (props.body.sort === undefined) return "created_at";
    return props.body.sort.startsWith("-")
      ? props.body.sort.substring(1)
      : props.body.sort;
  })();
  const sortDirection = props.body.sort?.startsWith("-") ? "desc" : "asc";
  const orderBy: Prisma.hrm_time_tracking_member_sessionsOrderByWithRelationInput =
    {};
  if (sortField === "created_at") {
    orderBy.created_at = sortDirection;
  } else if (sortField === "expired_at") {
    orderBy.expired_at = sortDirection;
  }
  const records =
    await MyGlobal.prisma.hrm_time_tracking_member_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...HrmTimeTrackingMemberSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.hrm_time_tracking_member_sessions.count({
    where,
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
      HrmTimeTrackingMemberSessionAtSummaryTransformer.transform,
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
// import { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
// import { IPageIHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMemberSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingGuestSessions(props: {
//   guest: GuestPayload;
//   body: IHrmTimeTrackingMemberSession.IRequest;
// }): Promise<IPageIHrmTimeTrackingMemberSession.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_member_sessions.findMany({
//     ...HrmTimeTrackingMemberSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingMemberSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------