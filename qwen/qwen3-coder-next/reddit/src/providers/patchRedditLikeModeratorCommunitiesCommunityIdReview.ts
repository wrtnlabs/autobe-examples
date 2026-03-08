import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorCommunitiesCommunityIdReview(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport.ISummary> {
  const { moderator, communityId, body } = props;
  // Verify the moderator has access to the specified community
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: moderator.id,
        community_id: communityId,
      },
    });
  if (!moderatorRole) {
    throw new HttpException(
      "Access denied. You are not a moderator of this community.",
      403,
    );
  }
  // Build where clause for reports
  const whereClause: Prisma.reddit_like_reportsWhereInput = {
    status: "pending",
    deleted_at: null,
  };
  // Apply additional filters from request
  if (body.reporter_id) {
    whereClause.reporter_id = body.reporter_id;
  }
  if (body.reported_post_id) {
    whereClause.reported_post_id = body.reported_post_id;
  }
  if (body.reported_comment_id) {
    whereClause.reported_comment_id = body.reported_comment_id;
  }
  if (body.created_at_min || body.created_at_max) {
    const dateFilter: Prisma.DateTimeFilter<"reddit_like_reports"> = {};
    if (body.created_at_min) {
      dateFilter.gte = body.created_at_min;
    }
    if (body.created_at_max) {
      dateFilter.lte = body.created_at_max;
    }
    whereClause.created_at = dateFilter;
  }
  // Build order by clause
  const orderByClause =
    body.sort === "created_at"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  // Calculate pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch reports with pagination and include reporter details
  const reports = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: orderByClause,
    select: {
      id: true,
      reporter_id: true,
      reporter: {
        select: {
          id: true,
          username: true,
          email: true,
          display_name: true,
          avatar_url: true,
          bio: true,
          karma_score: true,
          created_at: true,
        },
      },
      reported_post_id: true,
      reported_comment_id: true,
      status: true,
      created_at: true,
    },
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where: whereClause,
  });
  // Transform to response format
  const transformedReports: IRedditLikeReport.ISummary[] = reports.map(
    (report) => {
      const contentType = report.reported_post_id ? "post" : "comment";
      const contentId =
        report.reported_post_id || report.reported_comment_id || "";
      return {
        id: report.id,
        reporter: {
          id: report.reporter.id,
          entity_type: contentType as "post" | "comment" | "community",
          title: report.reporter.display_name || "",
          content: report.reporter.email || "",
          score: report.reporter.karma_score,
          hit_count: 0,
          created_at: report.reporter.created_at.toISOString(),
        } satisfies IRedditLikeMember.ISummary,
        reported_content_type: contentType,
        reported_content_id: contentId,
        status: report.status as "pending" | "approved" | "dismissed",
        created_at: report.created_at.toISOString(),
      } satisfies IRedditLikeReport.ISummary;
    },
  );
  return {
    data: transformedReports,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
