import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
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

export async function patchRedditLikeGuestCommunitiesCommunityNameFeed(props: {
  guest: GuestPayload;
  communityName: string;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Find community by name
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      name: props.communityName,
      deleted_at: null,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Build where clause
  const whereClause: Prisma.reddit_like_postsWhereInput = {
    community_id: community.id,
    deleted_at: null,
  };
  // Build orderBy clause
  let orderByClause:
    | Prisma.reddit_like_postsOrderByWithRelationInput
    | Prisma.reddit_like_postsOrderByWithRelationInput[] = {
    created_at: "desc" as const,
  };
  switch (props.body.sort) {
    case "new":
      orderByClause = {
        created_at: "desc" as const,
      } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
      break;
    case "top":
      orderByClause = {
        score: "desc" as const,
        created_at: "desc" as const,
      } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
      break;
    case "hot":
    case "controversial":
      orderByClause = [
        { score: "desc" as const },
        { created_at: "desc" as const },
      ] satisfies Prisma.reddit_like_postsOrderByWithRelationInput[];
      break;
    default:
      orderByClause = {
        created_at: "desc" as const,
      } satisfies Prisma.reddit_like_postsOrderByWithRelationInput;
      break;
  }
  // Apply time filter for top sorting
  if (props.body.sort === "top" && props.body.time) {
    const timeFilter = getStartOfTimeRange(props.body.time);
    if (timeFilter) {
      whereClause.created_at = {
        gte: timeFilter,
      } satisfies Prisma.DateTimeFilter;
    }
  }
  // Get posts with select
  const data = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      author_id: true,
      community_id: true,
      score: true,
      comment_count: true,
      created_at: true,
      author: {
        select: {
          id: true,
          created_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          icon_url: true,
          created_at: true,
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereClause,
  });
  // Transform posts to ISummary format
  const transformedData: IRedditLikePost.ISummary[] = data.map((post) => ({
    id: post.id,
    title: post.title,
    author: {
      id: post.author.id,
      entity_type: "post" as const,
      title: post.title,
      content: "",
      score: post.score,
      hit_count: post.comment_count,
      created_at: post.created_at.toISOString(),
    } satisfies IRedditLikeMember.ISummary,
    community: {
      id: post.community.id,
      name: post.community.name,
      icon_url: post.community.icon_url,
      created_at: post.community.created_at.toISOString(),
    } satisfies IRedditLikeCommunity.ISummary,
    score: post.score,
    comment_count: post.comment_count,
    created_at: post.created_at.toISOString(),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditLikePost.ISummary;
}
// Helper function to get start of time range
function getStartOfTimeRange(time: string): Date | null {
  const now = new Date();
  switch (time) {
    case "today":
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return today;
    case "week":
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return weekAgo;
    case "month":
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return monthAgo;
    case "year":
      const yearAgo = new Date(now.getFullYear() - 1, 0, 1);
      return yearAgo;
    case "all":
    default:
      return null;
  }
}
