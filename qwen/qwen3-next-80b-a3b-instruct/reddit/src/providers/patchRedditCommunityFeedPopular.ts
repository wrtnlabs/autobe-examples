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

export async function patchRedditCommunityFeedPopular(props: {
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const { sort = "hot", timeFilter, page = 1, limit = 20 } = props.body;
  // Validate sort and limit
  if (!["hot", "new", "top", "controversial"].includes(sort)) {
    throw new HttpException("Invalid sort option", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  if (page < 1) {
    throw new HttpException("Page must be >= 1", 400);
  }
  const skip = (page - 1) * limit;
  // Base WHERE clause - removed deleted_at since it's not a valid Prisma filter field
  const where: Prisma.reddit_community_postsWhereInput = {};
  // Time filter condition
  let timeFilterCondition:
    | {
        gte: string;
      }
    | undefined;
  if (timeFilter) {
    let cutoff: string;
    const now = toISOStringSafe(new Date());
    switch (timeFilter) {
      case "today":
        cutoff = toISOStringSafe(new Date(new Date().setHours(0, 0, 0, 0)));
        break;
      case "week":
        cutoff = toISOStringSafe(
          new Date(new Date().setDate(new Date().getDate() - 7)),
        );
        break;
      case "month":
        cutoff = toISOStringSafe(
          new Date(new Date().setMonth(new Date().getMonth() - 1)),
        );
        break;
      case "year":
        cutoff = toISOStringSafe(
          new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        );
        break;
      case "all":
        cutoff = "1970-01-01T00:00:00.000Z";
        break;
      default:
        throw new HttpException("Invalid time filter", 400);
    }
    timeFilterCondition = { gte: cutoff };
  }
  if (timeFilterCondition) {
    where.created_at = timeFilterCondition;
  }
  // Define SQL query with joins, computed fields, and sorting
  let orderByClause: string;
  switch (sort) {
    case "hot":
      orderByClause =
        "(COALESCE(post_votes.vote_score, 0) + 1) / POWER(GREATEST((EXTRACT(EPOCH FROM (NOW() - p.created_at))/3600 + 2), 1), 1.5) DESC";
      break;
    case "new":
      orderByClause = "p.created_at DESC";
      break;
    case "top":
      orderByClause = "COALESCE(post_votes.vote_score, 0) DESC";
      break;
    case "controversial":
      orderByClause =
        "ABS(COALESCE(post_votes.upvotes, 0) - COALESCE(post_votes.downvotes, 0)) DESC";
      break;
    default:
      throw new HttpException("Invalid sort type", 400);
  }
  const sqlQuery = Prisma.sql`
    SELECT
      p.id,
      p.title,
      p.author_id,
      p.community_id,
      COALESCE(post_votes.vote_score, 0) AS vote_score,
      p.comment_count,
      p.created_at,
      p.updated_at,
      p.url,
      p.image_url,
      m.id AS member_id,
      m.username,
      m.display_name,
      m.bio,
      m.avatar_url,
      m.karma_score,
      m.created_at AS member_created_at,
      c.name,
      c.description,
      c.icon_url,
      c.subscriber_count,
      c.created_at AS community_created_at,
      c.updated_at AS community_updated_at,
      COALESCE(post_votes.upvotes, 0) AS upvotes,
      COALESCE(post_votes.downvotes, 0) AS downvotes
    FROM reddit_community_posts p
    INNER JOIN reddit_community_members m ON p.author_id = m.id
    INNER JOIN reddit_community_communities c ON p.community_id = c.id
    LEFT JOIN (
      SELECT
        post_id,
        SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END) AS upvotes,
        SUM(CASE WHEN vote = 'down' THEN 1 ELSE 0 END) AS downvotes,
        SUM(CASE WHEN vote = 'up' THEN 1 WHEN vote = 'down' THEN -1 ELSE 0 END) AS vote_score
      FROM reddit_community_post_votes
      GROUP BY post_id
    ) AS post_votes ON p.id = post_votes.post_id
    WHERE p.visibility = 'public' AND p.deleted_at IS NULL
    ORDER BY ${Prisma.raw(orderByClause)}
    LIMIT $1 OFFSET $2
  `;
  const data = await MyGlobal.prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      author_id: string;
      community_id: string;
      vote_score: number;
      comment_count: number;
      created_at: string;
      updated_at: string;
      url: string | null;
      image_url: string | null;
      member_id: string;
      username: string;
      display_name: string;
      bio: string | null;
      avatar_url: string | null;
      karma_score: number;
      member_created_at: string;
      name: string;
      description: string;
      icon_url: string | null;
      subscriber_count: number;
      community_created_at: string;
      community_updated_at: string;
      upvotes: number;
      downvotes: number;
    }>
  >(sqlQuery, limit, skip);
  // Compute total count
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where,
  });
  // Transform to summary
  const transformed = data.map((post) => {
    return {
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      author: {
        id: post.member_id as string & tags.Format<"uuid">,
        username: post.username,
        display_name: post.display_name,
        bio: post.bio,
        avatar_url: post.avatar_url
          ? (post.avatar_url as string & tags.Format<"uri">)
          : null,
        karma_score: post.karma_score,
        created_at: post.member_created_at as string & tags.Format<"date-time">,
      } satisfies IRedditCommunityMember.ISummary,
      community: {
        id: post.community_id as string & tags.Format<"uuid">,
        name: post.name,
        description: post.description,
        icon_url: post.icon_url
          ? (post.icon_url as string & tags.Format<"uri">)
          : null,
        subscriber_count: post.subscriber_count,
        created_at: post.community_created_at as string &
          tags.Format<"date-time">,
        updated_at: post.community_updated_at as string &
          tags.Format<"date-time">,
      } satisfies IRedditCommunityCommunity.ISummary,
      voteScore: post.vote_score,
      commentCount: post.comment_count,
      createdAt: post.created_at as string & tags.Format<"date-time">,
      updatedAt: post.updated_at as string & tags.Format<"date-time">,
      url: post.url ? (post.url as string & tags.Format<"uri">) : null,
      imageUrl: post.image_url
        ? (post.image_url as string & tags.Format<"uri">)
        : null,
    } satisfies IRedditCommunityPost.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  } satisfies IPageIRedditCommunityPost.ISummary;
}
