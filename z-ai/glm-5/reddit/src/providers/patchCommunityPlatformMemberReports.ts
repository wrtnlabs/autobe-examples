import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportAtSummaryTransformer } from "../transformers/CommunityPlatformReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  // Default values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const status = props.body.status ?? "pending";
  const skip = (page - 1) * limit;
  // Get all communities where the member is a moderator
  const moderatorRoles =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        community_id: true,
      },
    });
  const moderatedCommunityIds = moderatorRoles.map((role) => role.community_id);
  // Authorization check for specific community filter
  if (props.body.communityId !== undefined) {
    if (!moderatedCommunityIds.includes(props.body.communityId)) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // If user has no moderator roles, return empty result
  if (moderatedCommunityIds.length === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  // Build community filter
  const communityFilter =
    props.body.communityId !== undefined
      ? props.body.communityId
      : { in: moderatedCommunityIds };
  // Build where clause
  const whereInput = {
    community_id: communityFilter,
    status: status,
    ...(props.body.contentType === "post" && {
      postReport: { isNot: null },
    }),
    ...(props.body.contentType === "comment" && {
      commentTarget: { isNot: null },
    }),
  } satisfies Prisma.community_platform_reportsWhereInput;
  // Query reports with transformer select
  const reports = await MyGlobal.prisma.community_platform_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityPlatformReportAtSummaryTransformer.select(),
  });
  // Get total count
  const totalRecords = await MyGlobal.prisma.community_platform_reports.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    reports,
    CommunityPlatformReportAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
