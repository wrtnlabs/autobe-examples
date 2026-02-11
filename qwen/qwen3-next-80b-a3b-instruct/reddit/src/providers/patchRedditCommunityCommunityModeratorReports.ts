import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityModeratorReports(props: {
  communityModerator: CommunitymoderatorPayload;
  body: IRedditCommunityCommentReport.IRequest;
}): Promise<IPageIRedditCommunityCommentReport> {
  const {
    status,
    target_type,
    comment_id,
    reason,
    created_at_start,
    created_at_end,
    sortBy,
    page,
    limit,
  } = props.body;
  // Find all communities this moderator moderates
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_community_community_moderators.findMany({
      where: {
        id: props.communityModerator.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Extract community IDs from moderator records via join table
  const moderatorRelations =
    await MyGlobal.prisma.reddit_community_user_communities.findMany({
      where: {
        reddit_community_member_id: {
          in: moderatorCommunities.map((m) => m.id),
        },
      },
      select: { reddit_community_community_id: true },
    });
  const communityIds = moderatorRelations.map(
    (m) => m.reddit_community_community_id,
  );
  // If moderator doesn't moderate any community, return empty result
  if (communityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      },
    };
  }
  // Build where clause for reports
  const where: Prisma.reddit_community_comment_reportsWhereInput = {
    status,
    comment_id: comment_id ? { equals: comment_id } : undefined,
    reason: reason ? { contains: reason } : undefined,
    created_at:
      created_at_start || created_at_end
        ? {
            gte: created_at_start || undefined,
            lte: created_at_end || undefined,
          }
        : undefined,
  };
  // Compute target_type filter
  if (target_type === "comment") {
    where.comment_id = { not: { isSet: true } }; // Use { not: { isSet: true } } to express NOT NULL without assigning null
  } else if (target_type === "post") {
    // Since reddit_community_comment_reports has no post_id field,
    // no report can have target_type='post'. Return empty result.
    where.comment_id = { equals: "invalid-uuid" };
  }
  // Find all users who are members of the communities this moderator moderates
  const memberIds =
    await MyGlobal.prisma.reddit_community_user_communities.findMany({
      where: { reddit_community_community_id: { in: communityIds } },
      select: { reddit_community_member_id: true },
    });
  const reporterIds = memberIds.map((m) => m.reddit_community_member_id);
  // Also include owners and moderators of these communities as possible reporters
  const ownerIds =
    await MyGlobal.prisma.reddit_community_community_owners.findMany({
      where: { id: { in: communityIds } },
      select: { id: true },
    });
  const moderatorIds =
    await MyGlobal.prisma.reddit_community_community_moderators.findMany({
      where: { id: { in: communityIds } },
      select: { id: true },
    });
  // Combine all possible reporter IDs
  const allPossibleReporterIds = [
    ...reporterIds,
    ...ownerIds.map((o) => o.id),
    ...moderatorIds.map((m) => m.id),
  ];
  // Apply reporter_id filter
  where.reporter_id = { in: allPossibleReporterIds };
  // Sort
  const orderBy: Prisma.reddit_community_comment_reportsOrderByWithRelationInput =
    {
      created_at: sortBy === "newest" ? "desc" : "asc",
    };
  // Calculate pagination
  const skip = (page - 1) * limit;
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_comment_reports.count({
    where,
  });
  // Fetch data
  const reports =
    await MyGlobal.prisma.reddit_community_comment_reports.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        comment_id: true,
        reporter_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
      },
    });
  // Convert Prisma datetime objects to string & Format<'date-time'>
  const mappedReports = reports.map((report) => ({
    id: report.id as string & tags.Format<"uuid">,
    comment_id: report.comment_id as string & tags.Format<"uuid">,
    reporter_id: report.reporter_id as string & tags.Format<"uuid">,
    reason: report.reason,
    status: report.status as "pending" | "approved" | "dismissed",
    created_at: toISOStringSafe(report.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(report.updated_at) as string &
      tags.Format<"date-time">,
    resolved_at: report.resolved_at
      ? (toISOStringSafe(report.resolved_at) as string &
          tags.Format<"date-time">)
      : null,
  }));
  return {
    data: mappedReports,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
