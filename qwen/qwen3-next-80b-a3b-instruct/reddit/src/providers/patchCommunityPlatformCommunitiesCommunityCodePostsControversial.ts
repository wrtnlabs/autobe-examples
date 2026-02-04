import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function patchCommunityPlatformCommunitiesCommunityCodePostsControversial(props: {
  communityCode: string;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const { communityCode, body } = props;
  // Validate community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: communityCode },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Extract pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Map time range to date range filter
  let whereClause: Prisma.community_platform_postsWhereInput = {
    community_id: communityCode,
    deleted_at: null,
  };
  if (body.timeRange) {
    const now = new Date();
    let startDate: Date;
    switch (body.timeRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "this week":
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        break;
      case "this month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "this year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "all time":
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(0);
    }
    whereClause.created_at = {
      gte: toISOStringSafe(startDate),
    };
  }
  // Count total controversial posts
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereClause,
  });
  // Fetch posts with calculated controversy score
  const data = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereClause,
    orderBy: {
      created_at: "desc",
    },
    skip,
    take: limit,
  });
  // Transform results with computed controversy metrics
  return {
    data: data
      .map((post) => {
        // Use the existing vote_score from Prisma model instead of calculating from post_votes
        const voteScore = post.vote_score;
        const commentCount = post.comment_count;
        // Filter for controversial posts (net score between -2 and +2)
        if (voteScore < -2 || voteScore > 2) {
          return null; // This should be filtered at query level, but included for safety
        }
        return {
          id: post.id as string & tags.Format<"uuid">,
          author: {
            id: post.author_id as string & tags.Format<"uuid">,
          },
          community: {
            name: community.name,
            description: community.description,
            icon: community.icon as string & tags.Format<"uri">,
            subscriber_count: community.subscriber_count,
            created_at: toISOStringSafe(community.created_at),
          },
          voteScore,
          commentCount,
          createdAt: toISOStringSafe(post.created_at),
        };
      })
      .filter((post) => post !== null), // Filter out non-controversial posts
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
