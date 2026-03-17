import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformContentReportAtSummaryTransformer } from "../transformers/CommunityPlatformContentReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminReportsPriority(props: {
  admin: AdminPayload;
  body: ICommunityPlatformContentReport.IRequest;
}): Promise<IPageICommunityPlatformContentReport.ISummary> {
  // 1. Determine communities where admin has moderation roles
  const moderationRoles =
    await MyGlobal.prisma.community_platform_moderation_roles.findMany({
      where: {
        community_platform_member_id: props.admin.id,
        deleted_at: null,
      },
      select: { community_platform_community_id: true },
    });
  const adminCommunityIds = moderationRoles.map(
    (role) => role.community_platform_community_id,
  );
  // If no communities to moderate, return empty
  if (adminCommunityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // 2. Validate community filter if provided
  if (props.body.community_id && props.body.community_id !== undefined) {
    if (!adminCommunityIds.includes(props.body.community_id)) {
      throw new HttpException(
        "Admin does not have moderation role in specified community",
        403,
      );
    }
  }
  // 3. Build base where clause with admin's communities
  const communityFilter =
    props.body.community_id && props.body.community_id !== undefined
      ? { community_id: props.body.community_id }
      : { community_id: { in: adminCommunityIds } };
  // Build conditional content_type filter
  const contentTypeFilter =
    props.body.content_type === "post"
      ? { postReport: { isNot: null } }
      : props.body.content_type === "comment"
        ? { commentReport: { isNot: null } }
        : {};
  const whereInput = {
    ...communityFilter,
    status: "pending", // Only pending reports for prioritization
    deleted_at: null,
    ...(props.body.reporter_member_id &&
      props.body.reporter_member_id !== undefined && {
        reporter_member_id: props.body.reporter_member_id,
      }),
    ...(props.body.search &&
      props.body.search !== undefined && {
        reason: { contains: props.body.search, mode: "insensitive" as const },
      }),
    ...(props.body.created_after &&
      props.body.created_after !== undefined && {
        created_at: { gte: props.body.created_after }, // String comparison works for ISO dates
      }),
    ...(props.body.created_before &&
      props.body.created_before !== undefined && {
        created_at: { lte: props.body.created_before },
      }),
    ...contentTypeFilter,
  } satisfies Prisma.community_platform_content_reportsWhereInput;
  // 5. Calculate pagination with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = (page - 1) * limit;
  // 6. Get total count
  const total = await MyGlobal.prisma.community_platform_content_reports.count({
    where: whereInput,
  });
  // 7. Calculate priority weight based on reason keywords
  // High priority keywords: harassment, threat, spam
  // Medium priority: inappropriate, offensive, rule violation
  const highPriorityKeywords = ["harassment", "threat", "spam"];
  const mediumPriorityKeywords = [
    "inappropriate",
    "offensive",
    "rule violation",
    "violation",
  ];
  // Fetch all pending reports for sorting
  const allReports =
    await MyGlobal.prisma.community_platform_content_reports.findMany({
      where: whereInput,
      ...CommunityPlatformContentReportAtSummaryTransformer.select(),
    });
  // Calculate priority scores
  const reportsWithPriority = allReports.map((report) => {
    let priorityScore = 0;
    // Age priority: older reports get higher score (1 point per hour)
    const reportAgeHours =
      (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60);
    priorityScore += Math.floor(reportAgeHours);
    // Keyword priority
    const reasonLower = report.reason.toLowerCase();
    if (highPriorityKeywords.some((keyword) => reasonLower.includes(keyword))) {
      priorityScore += 10;
    }
    if (
      mediumPriorityKeywords.some((keyword) => reasonLower.includes(keyword))
    ) {
      priorityScore += 5;
    }
    return { report, priorityScore };
  });
  // Sort by priority score (descending) and then by age (ascending)
  reportsWithPriority.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return (
      new Date(a.report.created_at).getTime() -
      new Date(b.report.created_at).getTime()
    );
  });
  // 8. Apply pagination
  const paginatedReports = reportsWithPriority.slice(skip, skip + limit);
  // 9. Transform results
  const data = await ArrayUtil.asyncMap(
    paginatedReports.map((item) => item.report),
    CommunityPlatformContentReportAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
