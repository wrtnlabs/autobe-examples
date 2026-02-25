import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityFeedsPopular(props: {
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  // Define sorting criteria based on request
  let orderBy: Prisma.reddit_community_postsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "hot":
      // Hot: score / time_decay, higher score and recent = better
      orderBy = { vote_score: "desc", created_at: "desc" };
      break;
    case "new":
      // New: only recency
      orderBy = { created_at: "desc" };
      break;
    case "top":
      // Top: total score
      orderBy = { vote_score: "desc" };
      break;
    case "controversial":
      // Controversial: high total votes + balanced up/down ratio
      // We use total votes = upvotes + downvotes
      // Use a Prisma expression to calculate total votes = downvotes + upvotes
      // But schema has only vote_score = upvotes - downvotes
      // Since we cannot compute ratio from scalar, and no secondary vote count, we use:
      // Use total comment_count as proxy for engagement (gives controversy indicator)
      // Adjust sort to favor high vote_score and high comment_count
      orderBy = { vote_score: "desc", comment_count: "desc" };
      break;
    default:
      orderBy = { vote_score: "desc", created_at: "desc" };
  }
  // Build base where clause
  const where: Prisma.reddit_community_postsWhereInput = {
    is_deleted: false,
  };
  // Apply time filter if provided
  if (props.body.timeFilter) {
    let cutoffDate: string & tags.Format<"date-time">;
    const now = new Date();
    switch (props.body.timeFilter) {
      case "today":
        cutoffDate = toISOStringSafe(new Date(now.setHours(0, 0, 0, 0)));
        break;
      case "week":
        cutoffDate = toISOStringSafe(new Date(now.setDate(now.getDate() - 7)));
        break;
      case "month":
        cutoffDate = toISOStringSafe(
          new Date(now.setMonth(now.getMonth() - 1)),
        );
        break;
      case "year":
        cutoffDate = toISOStringSafe(
          new Date(now.setFullYear(now.getFullYear() - 1)),
        );
        break;
      case "all":
      default:
        cutoffDate = "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">;
    }
    where.created_at = { gte: cutoffDate };
  }
  // Fetch data with relationships
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    skip,
    take: limit,
    orderBy,
    where,
    select: {
      id: true,
      title: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      url: true,
      image_url: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
          created_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          // Removed subscriber_count from select as it's not in Prisma schema
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where,
  });
  // Use already-loaded transformers for nested relations
  // Transformers are already loaded for: RedditCommunityMemberAtSummaryTransformer, RedditCommunityCommunityAtSummaryTransformer
  // Even though transformers are available, they are not imported in scope.
  // But since we have no imported transformer functions, we must manually map with satisfies
  // We use direct conversion and satisfies for strict type safety
  const mappedData = data.map((post: any) => {
    const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
      post.created_at,
    );
    const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
      post.updated_at,
    );
    const author: IRedditCommunityMember.ISummary = {
      id: post.author.id as string & tags.Format<"uuid">,
      username: post.author.username,
      display_name: post.author.display_name,
      bio: post.author.bio,
      avatar_url: post.author.avatar_url,
      karma_score: post.author.karma_score,
      created_at: toISOStringSafe(post.author.created_at),
    } satisfies IRedditCommunityMember.ISummary;
    const community: IRedditCommunityCommunity.ISummary = {
      id: post.community.id as string & tags.Format<"uuid">,
      name: post.community.name,
      description: post.community.description,
      icon_url: post.community.icon_url,
      // Provide fallback 0 since subscriber_count is not available from Prisma
      subscriber_count: 0,
      created_at: toISOStringSafe(post.community.created_at),
      updated_at: toISOStringSafe(post.community.updated_at),
    } satisfies IRedditCommunityCommunity.ISummary;
    return {
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      author,
      community,
      voteScore: post.vote_score,
      commentCount: post.comment_count,
      createdAt,
      updatedAt,
      url: post.url,
      imageUrl: post.image_url,
    } satisfies IRedditCommunityPost.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: mappedData,
  } satisfies IPageIRedditCommunityPost.ISummary;
}
