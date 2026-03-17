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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformContentReportAtSummaryTransformer } from "../transformers/CommunityPlatformContentReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberReportsPriority(props: {
  member: MemberPayload;
  body: ICommunityPlatformContentReport.IRequest;
}): Promise<IPageICommunityPlatformContentReport.ISummary> {
  // 1. Get communities where member has moderation role
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
    // No communities to moderate → return empty page
    return {
      data: [],
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 100,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const moderatedCommunityIds = moderationRoles.map(
    (role) => role.community_platform_community_id,
  );
  // 2. Build where conditions
  const whereInput: Prisma.community_platform_content_reportsWhereInput = {
    status: "pending", // Only pending reports for prioritization
    community_id: {
      in: moderatedCommunityIds,
    },
    deleted_at: null,
  };
  // Apply optional filters
  if (props.body.community_id !== undefined) {
    // If filtering by specific community, ensure member moderates it
    if (!moderatedCommunityIds.includes(props.body.community_id)) {
      // Not authorized for this community → return empty results
      return {
        data: [],
        pagination: {
          current: props.body.page ?? 1,
          limit: props.body.limit ?? 100,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      };
    }
    whereInput.community_id = props.body.community_id;
  }
  if (props.body.reporter_member_id !== undefined) {
    whereInput.reporter_member_id = props.body.reporter_member_id;
  }
  // Content type filtering
  if (props.body.content_type !== undefined) {
    if (props.body.content_type === "post") {
      whereInput.postReport = {
        isNot: null,
      };
    } else if (props.body.content_type === "comment") {
      whereInput.commentReport = {
        isNot: null,
      };
    }
  }
  // Date filtering - handle string dates properly
  const dateConditions: Prisma.DateTimeFilter = {};
  if (props.body.created_after !== undefined) {
    dateConditions.gte = new Date(props.body.created_after);
  }
  if (props.body.created_before !== undefined) {
    dateConditions.lte = new Date(props.body.created_before);
  }
  if (Object.keys(dateConditions).length > 0) {
    whereInput.created_at = dateConditions;
  }
  // Text search in reason field
  if (props.body.search !== undefined && props.body.search.trim() !== "") {
    whereInput.reason = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // 3. Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Priority scoring function (simple implementation)
  // Reports with certain keywords get higher priority
  const getPriorityScore = (reason: string): number => {
    const highPriorityKeywords = [
      "harassment",
      "threat",
      "violence",
      "hate",
      "discrimination",
      "spam",
      "scam",
      "fraud",
      "phishing",
    ];
    const lowerReason = reason.toLowerCase();
    let score = 0;
    // Base score: 1 point per high-priority keyword found
    highPriorityKeywords.forEach((keyword) => {
      if (lowerReason.includes(keyword)) {
        score += 1;
      }
    });
    return score;
  };
  // 5. Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_content_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      // Order by: first by keyword priority score (desc), then by age (asc)
      // We'll fetch all then sort in memory for simplicity
      ...CommunityPlatformContentReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_content_reports.count({
      where: whereInput,
    }),
  ]);
  // 6. Apply priority sorting
  const prioritizedData = data
    .map((report) => ({
      report,
      priorityScore: getPriorityScore(report.reason),
    }))
    .sort((a, b) => {
      // First by priority score (higher = first)
      if (a.priorityScore !== b.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      // Then by creation date (older = first)
      return a.report.created_at.getTime() - b.report.created_at.getTime();
    })
    .map((item) => item.report);
  // 7. Transform data
  const transformedData = await ArrayUtil.asyncMap(
    prioritizedData,
    CommunityPlatformContentReportAtSummaryTransformer.transform,
  );
  // 8. Calculate pagination metadata
  const pages = Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
