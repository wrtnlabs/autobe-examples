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
  // Extract pagination parameters with defaults
  const page: number = props.body.page ?? 1;
  const pageSize: number = props.body.pageSize ?? 20;
  const limit: number = props.body.limit ?? 100;
  // Validate pagination parameters
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (pageSize < 1 || pageSize > 100) {
    throw new HttpException("Page size must be between 1 and 100", 400);
  }
  if (limit < 0 || limit > 100) {
    throw new HttpException("Limit must be between 0 and 100", 400);
  }
  // Calculate skip
  const skip: number = (page - 1) * pageSize;
  // Build where filter
  const whereFilter: Prisma.hrm_platform_time_tracking_timezonesWhereInput = {
    deleted_at: null, // Default to active records only
  };
  // Add organization filter if provided
  if (props.body.organization_id !== undefined) {
    const organizationId: string & tags.Format<"uuid"> =
      props.body.organization_id;
    // Validate organization exists
    const organization =
      await MyGlobal.prisma.hrm_platform_organizations.findUnique({
        where: { id: organizationId },
      });
    if (organization === null) {
      throw new HttpException("Organization not found", 404);
    }
    whereFilter.organization_id = organizationId;
  }
  // Add timezone filter if provided
  if (props.body.timezone !== undefined) {
    whereFilter.timezone = props.body.timezone;
  }
  // Add status filter
  if (props.body.status === "deleted") {
    whereFilter.deleted_at = { not: null };
  } else {
    whereFilter.deleted_at = null;
  }
  // Build order by
  const orderBy: Array<Prisma.hrm_platform_time_tracking_timezonesOrderByWithRelationInput> =
    props.body.sortBy === "createdAt"
      ? [{ created_at: props.body.sortOrder ?? "desc" }]
      : props.body.sortBy === "updatedAt"
        ? [{ updated_at: props.body.sortOrder ?? "desc" }]
        : [{ created_at: "desc" }];
  // Get selector from transformer
  const selectArgs =
    HrmPlatformTimeTrackingTimezoneAtSummaryTransformer.select();
  // Execute findMany
  const records: Array<
    Prisma.hrm_platform_time_tracking_timezonesGetPayload<
      ReturnType<
        typeof HrmPlatformTimeTrackingTimezoneAtSummaryTransformer.select
      >
    >
  > = await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findMany({
    where: whereFilter,
    skip,
    take: limit,
    orderBy,
    ...selectArgs,
  });
  // Count total records
  const total: number =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.count({
      where: whereFilter,
    });
  // Transform records
  const data: Array<IHrmPlatformTimeTrackingTimezone.ISummary> =
    await ArrayUtil.asyncMap(
      records,
      HrmPlatformTimeTrackingTimezoneAtSummaryTransformer.transform,
    );
  // Calculate effective limit for pagination
  const effectiveLimit: number = Math.min(pageSize, limit);
  const pages: number = total === 0 ? 0 : Math.ceil(total / effectiveLimit);
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: effectiveLimit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmPlatformTimeTrackingTimezone.ISummary;
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