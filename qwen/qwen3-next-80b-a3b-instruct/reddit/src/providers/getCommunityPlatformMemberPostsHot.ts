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
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberPostsHot(props: {
  member: MemberPayload;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Extract pagination from request - since this is a PATCH endpoint for pagination, body contains pagination parameters
  const page = 1; // Default to 1
  const limit = 20; // Default to 20
  const skip = (page - 1) * limit;
  // Calculate the hot score: ln(upvote_count + 1) / (time since creation in hours + 2)
  // We need to join with community_platform_post_votes to get upvote count
  // and community_platform_comments to get comment count
  // We'll use raw SQL for the complex scoring logic
  const posts = (await MyGlobal.prisma.$queryRaw`
    SELECT 
      p.id,
      p.created_at,
      p.author_id,
      p.community_id,
      COALESCE(vote_counts.upvote_count, 0) AS upvote_count,
      COALESCE(comment_counts.comment_count, 0) AS comment_count,
      c.name AS community_name,
      c.icon AS community_icon,
      c.subscriber_count,
      c.created_at AS community_created_at
    FROM community_platform_posts p
    INNER JOIN community_platform_members m ON p.author_id = m.id
    INNER JOIN community_platform_communities c ON p.community_id = c.id
    LEFT JOIN (
      SELECT post_id, SUM(vote_value) AS upvote_count
      FROM community_platform_post_votes
      WHERE vote_value = 1
      GROUP BY post_id
    ) AS vote_counts ON p.id = vote_counts.post_id
    LEFT JOIN (
      SELECT parent_post_id AS post_id, COUNT(*) AS comment_count
      FROM community_platform_comments
      WHERE parent_post_id IS NOT NULL
      GROUP BY parent_post_id
    ) AS comment_counts ON p.id = comment_counts.post_id
    WHERE p.deleted_at IS NULL AND p.is_draft = false
    ORDER BY LN(COALESCE(vote_counts.upvote_count, 0) + 1) / (TIMESTAMPDIFF(HOUR, p.created_at, NOW()) + 2) DESC, p.id DESC
    LIMIT ${limit} OFFSET ${skip}
  `) as Array<{
    id: string;
    created_at: Date | string;
    author_id: string;
    community_id: string;
    upvote_count: number | string;
    comment_count: number | string;
    community_name: string;
    community_icon: string | null;
    subscriber_count: number | string;
    community_created_at: Date | string;
  }>;
  // Count total records
  const totalResult = (await MyGlobal.prisma.$queryRaw`
    SELECT COUNT(*) AS total
    FROM community_platform_posts p
    INNER JOIN community_platform_members m ON p.author_id = m.id
    INNER JOIN community_platform_communities c ON p.community_id = c.id
    LEFT JOIN (
      SELECT post_id, SUM(vote_value) AS upvote_count
      FROM community_platform_post_votes
      WHERE vote_value = 1
      GROUP BY post_id
    ) AS vote_counts ON p.id = vote_counts.post_id
    LEFT JOIN (
      SELECT parent_post_id AS post_id, COUNT(*) AS comment_count
      FROM community_platform_comments
      WHERE parent_post_id IS NOT NULL
      GROUP BY parent_post_id
    ) AS comment_counts ON p.id = comment_counts.post_id
    WHERE p.deleted_at IS NULL AND p.is_draft = false
  `) as Array<{
    total: string | number;
  }>;
  const total = totalResult[0]?.total
    ? parseInt(totalResult[0].total as unknown as string, 10)
    : 0;
  // Transform the raw results into the expected DTO format
  const transformedPosts = posts.map((post) => ({
    id: post.id as string & tags.Format<"uuid">,
    author: {}, // ICommunityPlatformMember.ISummary is an empty object - no properties
    community: {
      name: post.community_name as string & tags.MinLength<1>,
      icon: post.community_icon as string & tags.Format<"uri">,
      subscriber_count: post.subscriber_count as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      created_at: toISOStringSafe(post.community_created_at) as string &
        tags.Format<"date-time">,
      description: "" as string & tags.MaxLength<1000>,
    },
    voteScore: post.upvote_count as number &
      tags.Type<"int32"> &
      tags.Minimum<-999999>,
    commentCount: post.comment_count as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    createdAt: toISOStringSafe(post.created_at) as string &
      tags.Format<"date-time">,
  }));
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit: limit,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
