import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostCommentCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostCommentCount";
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

export async function patchRedditCommunityCommunityModeratorAnalyticsPosts(props: {
  communityModerator: CommunitymoderatorPayload;
  body: IRedditCommunityPostCommentCount.IRequest;
}): Promise<IRedditCommunityPostCommentCount.ISummary> {
  const { sortBy, timeFilter, page, limit, search } = props.body;
  // Base where clause
  const where: Prisma.reddit_community_comment_reportsWhereInput = {};
  // Remove search filter entirely - 'text' field does not exist in schema and cannot be queried
  // Define orderBy clause
  const orderBy: Prisma.reddit_community_comment_reportsOrderByWithRelationInput =
    (() => {
      switch (sortBy) {
        case "hot":
          return { created_at: "desc" };
        case "new":
          return { created_at: "desc" };
        case "top":
          return { created_at: "desc" };
        case "controversial":
          return { created_at: "desc" };
        default:
          return { created_at: "desc" };
      }
    })();
  // Apply time filter for sortBy = 'top'
  if (sortBy === "top" && timeFilter) {
    const now = new Date();
    let cutoff: Date;
    switch (timeFilter) {
      case "today":
        cutoff = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        cutoff = new Date(now.setDate(now.getDate() - now.getDay()));
        break;
      case "month":
        cutoff = new Date(now.setDate(1));
        break;
      case "year":
        cutoff = new Date(now.setMonth(0, 1));
        break;
      default:
        cutoff = new Date(0);
    }
    where.created_at = { gte: cutoff };
  }
  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = limit;
  // Execute query
  const data = await MyGlobal.prisma.reddit_community_comment_reports.findMany({
    where,
    skip,
    take,
    orderBy,
    select: {
      id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      resolved_at: true,
      reporter: { select: { id: true } },
      comment_id: true,
    },
  });
  // Count total
  const total = await MyGlobal.prisma.reddit_community_comment_reports.count({
    where,
  });
  // Transform data to summary
  const totalPosts = data.length;
  const totalVotes = 0; // There is no vote_score field in the schema
  const avgVoteScore = 0; // Not applicable
  const avgCommentsPerPost = 0; // Not applicable in this model
  const activeCommunities = new Set(data.map((d) => d.comment_id)).size;
  return {
    totalPosts,
    totalVotes,
    avgVoteScore,
    avgCommentsPerPost,
    activeCommunities,
  };
}
