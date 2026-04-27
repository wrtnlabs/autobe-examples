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

export async function patchCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunityReport.IRequest;
}): Promise<IPageICommunityPlatformCommunityReport.ISummary> {
  const moderatedIds = (
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: { community_platform_member_id: props.member.id },
      select: { community_platform_community_id: true },
    })
  ).map((r) => r.community_platform_community_id);
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (moderatedIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const communityFilter: Prisma.community_platform_community_reportsWhereInput =
    props.body.communityId !== undefined
      ? { community_id: props.body.communityId }
      : { community_id: { in: moderatedIds } };
  const whereInput: Prisma.community_platform_community_reportsWhereInput = {
    ...communityFilter,
    status: props.body.status ?? "pending",
    ...(props.body.reporterId !== undefined && {
      reporter_id: props.body.reporterId,
    }),
    ...(props.body.startDate !== undefined && {
      created_at: { gte: props.body.startDate },
    }),
    ...(props.body.endDate !== undefined && {
      created_at: { lte: props.body.endDate },
    }),
  };
  const skip = (page - 1) * limit;
  const orderByInput: Prisma.community_platform_community_reportsOrderByWithRelationInput =
    props.body.sortBy === "status"
      ? { status: props.body.sortDirection ?? "desc" }
      : { created_at: props.body.sortDirection ?? "desc" };
  const data =
    await MyGlobal.prisma.community_platform_community_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformCommunityReportAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_community_reports.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformCommunityReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
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
// export async function patchCommunityPlatformMemberReports(props: {
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