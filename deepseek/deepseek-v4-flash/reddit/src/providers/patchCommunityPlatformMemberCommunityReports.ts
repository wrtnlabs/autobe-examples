import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityReportAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformMemberCommunityReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunityReport.IRequest;
}): Promise<IPageICommunityPlatformCommunityReport.ISummary> {
  // Step 1: Determine which communities the member moderates
  const moderatorRecords =
    await MyGlobal.prisma.community_platform_moderators.findMany({
      where: { member_id: props.member.id },
      select: { community_id: true },
    });
  const moderatedCommunityIds: string[] = moderatorRecords.map(
    (m) => m.community_id,
  );
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  // If the member moderates no communities, return an empty page (not an error)
  if (moderatedCommunityIds.length === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  // Step 2: Build WHERE clause
  const where: Prisma.community_platform_community_reportsWhereInput = {};
  // Community scope: if communityId is provided, verify the member moderates it
  if (props.body.communityId !== undefined) {
    // If the member does NOT moderate this specific community, return empty page
    // (don't leak the existence of reports from communities the member doesn't manage)
    if (moderatedCommunityIds.includes(props.body.communityId) === false) {
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    where.community_id = props.body.communityId;
  } else {
    // Scope to all communities the member moderates
    where.community_id = { in: moderatedCommunityIds };
  }
  // Status filter — defaults to 'pending' per spec (moderators see actionable reports first)
  where.status = props.body.status ?? "pending";
  // Reporter filter
  if (props.body.reporterId !== undefined) {
    where.reporter_id = props.body.reporterId;
  }
  // Date range filter — use ISO datetime strings directly (no Date constructor)
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.startDate !== undefined) {
      createdAtFilter.gte = props.body.startDate;
    }
    if (props.body.endDate !== undefined) {
      createdAtFilter.lte = props.body.endDate;
    }
    where.created_at = createdAtFilter;
  }
  // Step 3: Pagination — offset-based (1-indexed page)
  const skip: number = (page - 1) * limit;
  // Step 4: Sort — default to created_at descending (newest first)
  const sortBy: "created_at" | "status" = props.body.sortBy ?? "created_at";
  const sortDirection: "asc" | "desc" = props.body.sortDirection ?? "desc";
  const orderBy = {
    [sortBy]: sortDirection,
  } satisfies Prisma.community_platform_community_reportsOrderByWithRelationInput;
  // Step 5: Execute queries — sequential (not Promise.all) per guidelines
  const records =
    await MyGlobal.prisma.community_platform_community_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...CommunityPlatformCommunityReportAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_community_reports.count({
      where,
    });
  // Step 6: Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformCommunityReportAtSummaryTransformer.transform,
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
// import { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
// import { IPageICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityReport";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformMemberCommunityReports(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformCommunityReport.IRequest;
// }): Promise<IPageICommunityPlatformCommunityReport.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_community_reports.findMany({
//     ...CommunityPlatformCommunityReportAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformCommunityReportAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------