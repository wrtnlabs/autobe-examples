import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestAnalyticsCommunitiesStatistics(props: {
  guest: GuestPayload;
  body: IRedditCloneCommunity.IAnalyticsRequest;
}): Promise<IPageIRedditCloneCommunity.IStatistic> {
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 20) satisfies number as number;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.reddit_clone_communitiesWhereInput = {};
  if (props.body.search) {
    where.OR = [
      { name: { contains: props.body.search, mode: "insensitive" as const } },
      {
        description: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
    ];
  }
  if (props.body.minSubscribers !== undefined) {
    where.subscriber_count = {
      gte: props.body.minSubscribers,
    };
  }
  if (props.body.maxSubscribers !== undefined) {
    where.subscriber_count = {
      ...(where.subscriber_count as any),
      lte: props.body.maxSubscribers,
    };
  }
  // Build order by clause
  const orderBy: Prisma.reddit_clone_communitiesOrderByWithRelationInput = {};
  if (props.body.sortBy) {
    switch (props.body.sortBy) {
      case "subscribers":
        orderBy.subscriber_count = props.body.sortOrder ?? "desc";
        break;
      case "posts":
        orderBy.posts = { _count: props.body.sortOrder ?? "desc" };
        break;
      case "votes":
        // orderBy._count is invalid - use subscriber_count instead
        orderBy.subscriber_count = props.body.sortOrder ?? "desc";
        break;
      case "engagement":
        // For engagement sorting, we'll use subscriber_count as proxy
        orderBy.subscriber_count = props.body.sortOrder ?? "desc";
        break;
      default:
        orderBy.created_at = "desc";
        break;
    }
  }
  // If no explicit sort order, default to recent first
  if (Object.keys(orderBy).length === 0) {
    orderBy.created_at = "desc";
  }
  // Fetch communities with statistics
  const [communities, total] = await Promise.all([
    MyGlobal.prisma.reddit_clone_communities.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_clone_communities.count({ where }),
  ]);
  // Calculate statistics for each community
  const data = await Promise.all(
    communities.map(async (community) => {
      // Calculate post count
      const postCountResult =
        await MyGlobal.prisma.reddit_clone_content_posts.aggregate({
          _count: true,
          where: { community_id: community.id, deleted_at: null },
        });
      // Calculate comment count
      const commentCountResult =
        await MyGlobal.prisma.reddit_clone_content_comments.aggregate({
          _count: true,
          where: {
            post: { community_id: community.id, deleted_at: null },
            deleted_at: null,
          },
        });
      // Calculate vote count
      const voteCountResult =
        await MyGlobal.prisma.reddit_clone_content_post_votes.aggregate({
          _count: true,
          where: {
            post: { community_id: community.id, deleted_at: null },
          },
        });
      // Calculate engagement rate
      const engagementRate =
        community.subscriber_count > 0
          ? (voteCountResult._count + commentCountResult._count) /
            community.subscriber_count
          : 0;
      // Calculate activity score based on recent activity
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentPosts =
        await MyGlobal.prisma.reddit_clone_content_posts.findMany({
          where: {
            community_id: community.id,
            created_at: { gte: thirtyDaysAgo },
            deleted_at: null,
          },
          select: { created_at: true, vote_score: true },
        });
      const activityScore = recentPosts.reduce((acc, post) => {
        const daysAgo =
          (Date.now() - new Date(post.created_at).getTime()) /
          (1000 * 60 * 60 * 24);
        const weight = Math.max(0.1, 1 - daysAgo / 30);
        return acc + post.vote_score * weight;
      }, 0);
      return {
        id: community.id as string & tags.Format<"uuid">,
        name: community.name,
        description: (community.description ?? "") as string,
        icon_url: (community.icon_url ?? "") as string,
        owner_id: community.owner_id as string & tags.Format<"uuid">,
        owner_username: "",
        subscriber_count: community.subscriber_count,
        post_count: postCountResult._count,
        comment_count: commentCountResult._count,
        vote_count: voteCountResult._count,
        engagement_rate: engagementRate,
        activity_score: Math.round(activityScore),
        community: {
          id: community.id as string & tags.Format<"uuid">,
          name: community.name,
          description: (community.description ?? "") as string,
          icon_url: (community.icon_url ?? "") as string,
          owner_id: community.owner_id as string & tags.Format<"uuid">,
          owner_username: "",
        },
      };
    }),
  );
  return {
    data,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
