import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformContentReportAtGroupedSummaryItemTransformer } from "../transformers/CommunityPlatformContentReportAtGroupedSummaryItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberReportsGrouped(props: {
  member: MemberPayload;
  body: ICommunityPlatformContentReport.IGroupedRequest;
}): Promise<IPageICommunityPlatformContentReport.IGroupedSummary> {
  // 1. Get communities where member has moderation roles
  const moderationRoles =
    await MyGlobal.prisma.community_platform_moderation_roles.findMany({
      where: {
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        community_platform_community_id: true,
      },
    });
  if (moderationRoles.length === 0) {
    // No communities to moderate - return empty page
    return {
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 100,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const communityIds = moderationRoles.map(
    (role) => role.community_platform_community_id,
  );
  // 2. Build WHERE conditions
  const whereConditions: Prisma.community_platform_content_reportsWhereInput = {
    community_id: {
      in: communityIds,
    },
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.created_after && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
    ...(props.body.updated_after && {
      updated_at: { gte: new Date(props.body.updated_after) },
    }),
    ...(props.body.updated_before && {
      updated_at: { lte: new Date(props.body.updated_before) },
    }),
  };
  // 3. First get all reports to group manually (simplified approach)
  const reports =
    await MyGlobal.prisma.community_platform_content_reports.findMany({
      where: whereConditions,
      ...CommunityPlatformContentReportAtGroupedSummaryItemTransformer.select(),
    });
  // 4. Group reports by content
  const groups = new Map<
    string,
    {
      content_type: "post" | "comment";
      content_id: string;
      community: any;
      individual_reports: any[];
      total_reports: number;
      latest_report_at: Date;
      first_report_at: Date;
    }
  >();
  for (const report of reports) {
    const contentType = report.postReport ? "post" : "comment";
    const contentId = report.postReport
      ? report.postReport.post.id
      : report.commentReport!.community_platform_comment_id; // Fix: access the comment ID directly
    const key = `${contentType}:${contentId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        content_type: contentType,
        content_id: contentId,
        community: report.community,
        individual_reports: [],
        total_reports: 0,
        latest_report_at: report.created_at,
        first_report_at: report.created_at,
      });
    }
    const group = groups.get(key)!;
    group.individual_reports.push(report);
    group.total_reports++;
    if (report.created_at > group.latest_report_at) {
      group.latest_report_at = report.created_at;
    }
    if (report.created_at < group.first_report_at) {
      group.first_report_at = report.created_at;
    }
  }
  // 5. Paginate groups
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const groupArray = Array.from(groups.values());
  const paginatedGroups = groupArray.slice(skip, skip + limit);
  // 6. Transform groups
  const transformedData = await Promise.all(
    paginatedGroups.map(async (group) => ({
      id: v4(),
      content_type: group.content_type,
      content_id: group.content_id,
      total_reports: group.total_reports,
      latest_report_at: toISOStringSafe(group.latest_report_at),
      first_report_at: toISOStringSafe(group.first_report_at),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        group.community,
      ),
      individual_reports: await ArrayUtil.asyncMap(
        group.individual_reports,
        CommunityPlatformContentReportAtGroupedSummaryItemTransformer.transform,
      ),
    })),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: groupArray.length,
      pages: Math.ceil(groupArray.length / limit),
    },
    data: transformedData,
  };
}
