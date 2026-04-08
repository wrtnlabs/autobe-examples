import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeTrackingTimezone";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimeTrackingTimezoneAtSummaryTransformer } from "../transformers/HrmPlatformTimeTrackingTimezoneAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimeTrackingTimezones(props: {
  member: MemberPayload;
  body: IHrmPlatformTimeTrackingTimezone.IRequest;
}): Promise<IPageIHrmPlatformTimeTrackingTimezone.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? 100;
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "asc";
  const where: Prisma.hrm_platform_time_tracking_timezonesWhereInput = {};
  if (props.body.status === "deleted") {
    where.deleted_at = { not: null };
  } else {
    where.deleted_at = null;
  }
  if (props.body.organization_id !== undefined) {
    where.organization_id = props.body.organization_id;
  }
  if (props.body.timezone !== undefined) {
    where.timezone = props.body.timezone;
  }
  if (props.body.organization_id !== undefined) {
    const organization =
      await MyGlobal.prisma.hrm_platform_organizations.findFirst({
        where: {
          id: props.body.organization_id,
          deleted_at: null,
        },
      });
    if (organization === null) {
      throw new HttpException("Organization not found", 404);
    }
  }
  const orderBy: Prisma.hrm_platform_time_tracking_timezonesOrderByWithRelationInput =
    sortBy === "updatedAt"
      ? { updated_at: sortOrder === "asc" ? "asc" : "desc" }
      : { created_at: sortOrder === "asc" ? "asc" : "desc" };
  const take = Math.min(Math.min(limit, pageSize), 100);
  const records =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take,
      ...HrmPlatformTimeTrackingTimezoneAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformTimeTrackingTimezoneAtSummaryTransformer.transform,
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
// import { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
// import { IPageIHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeTrackingTimezone";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberTimeTrackingTimezones(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTimeTrackingTimezone.IRequest;
// }): Promise<IPageIHrmPlatformTimeTrackingTimezone.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findMany({
//     ...HrmPlatformTimeTrackingTimezoneAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformTimeTrackingTimezoneAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------