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
import { RedditLikeReportAtSummaryTransformer } from "../transformers/RedditLikeReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorCommunitiesCommunityNameReports(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  // Look up community by name
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      name: props.communityName,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify moderator has role in this community
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: community.id,
      },
      select: { id: true },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause using nested relationships
  const where: Prisma.reddit_like_reportsWhereInput = {
    AND: [
      {
        OR: [
          { reportedPost: { community_id: community.id } },
          { reportedComment: { post: { community_id: community.id } } },
        ],
      },
      { status: "pending" as const },
    ],
  };
  // Apply optional filters from body
  if (props.body.search) {
    where.OR = [
      ...where.OR!,
      { reason: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  if (props.body.reporter_id) {
    where.reporter_id = props.body.reporter_id;
  }
  if (props.body.reported_post_id) {
    where.OR = [
      ...where.OR!,
      { reported_post_id: props.body.reported_post_id },
    ];
  }
  if (props.body.reported_comment_id) {
    where.OR = [
      ...where.OR!,
      { reported_comment_id: props.body.reported_comment_id },
    ];
  }
  // Date filters
  if (props.body.created_at_min || props.body.created_at_max) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_min) {
      dateFilter.gte = new Date(props.body.created_at_min);
    }
    if (props.body.created_at_max) {
      dateFilter.lte = new Date(props.body.created_at_max);
    }
    where.created_at = dateFilter;
  }
  // Build orderBy clause
  const orderBy =
    props.body.sort === "created_at_desc"
      ? { created_at: "desc" as const }
      : { created_at: "asc" as const };
  // Query reports with transformer select
  const data = await MyGlobal.prisma.reddit_like_reports.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditLikeReportAtSummaryTransformer.select(),
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    RedditLikeReportAtSummaryTransformer.transform,
  );
  // Count total records
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where,
  });
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: transformed,
  } satisfies IPageIRedditLikeReport.ISummary;
}
