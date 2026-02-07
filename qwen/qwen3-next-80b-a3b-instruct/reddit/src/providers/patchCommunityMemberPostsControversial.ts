import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberPostsControversial(props: {
  member: MemberPayload;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  const page = 1; // Default from spec, IRequest is empty
  const limit = 20; // Default from spec, IRequest is empty
  const skip = (page - 1) * limit;
  // Calculate total votes (upvotes - downvotes) and controversy score at database level
  // Using raw SQL to compute SUM of votes for ordering and filtering
  const data = await MyGlobal.prisma.$queryRawUnsafe<
    {
      id: string;
      title: string;
      author_display_name: string;
      community_name: string;
      vote_score: number;
      comment_count: number;
      post_created_at: string & tags.Format<"date-time">;
      content_type: string;
    }[]
  >(`
    SELECT
      p.id,
      p.title,
      m.display_name as author_display_name,
      c.name as community_name,
      COALESCE(SUM(CASE WHEN pv.vote_type = 'upvote' THEN 1 ELSE -1 END), 0) as vote_score,
      COALESCE(cc.comment_count, 0) as comment_count,
      p.created_at as post_created_at,
      p.content_type
    FROM community_posts p
    JOIN community_members m ON p.community_member_id = m.id
    JOIN community_communities c ON p.community_id = c.id
    JOIN community_post_statuses ps ON p.community_post_status_id = ps.id
    LEFT JOIN community_post_votes pv ON p.id = pv.post_id AND pv.deleted_at IS NULL
    LEFT JOIN community_post_comments_counts cc ON p.id = cc.post_id
    WHERE p.deleted_at IS NULL
      AND ps.status = 'approved'
    GROUP BY p.id, p.title, m.display_name, c.name, cc.comment_count, p.created_at, p.content_type
    HAVING COUNT(pv.post_id) >= 10
    ORDER BY COUNT(pv.post_id) DESC, 
             1 / (1 + ABS(COALESCE(SUM(CASE WHEN pv.vote_type = 'upvote' THEN 1 ELSE -1 END), 0))) DESC
    LIMIT ${limit} OFFSET ${skip}
  `);
  // Fix count query - properly await and extract count
  const totalResult = await MyGlobal.prisma.$queryRawUnsafe<
    {
      count: number;
    }[]
  >(`
    SELECT COUNT(*) as count
    FROM community_posts p
    JOIN community_members m ON p.community_member_id = m.id
    JOIN community_communities c ON p.community_id = c.id
    JOIN community_post_statuses ps ON p.community_post_status_id = ps.id
    LEFT JOIN community_post_votes pv ON p.id = pv.post_id AND pv.deleted_at IS NULL
    LEFT JOIN community_post_comments_counts cc ON p.id = cc.post_id
    WHERE p.deleted_at IS NULL
      AND ps.status = 'approved'
    GROUP BY p.id, p.title, m.display_name, c.name, cc.comment_count, p.created_at, p.content_type
    HAVING COUNT(pv.post_id) >= 10
  `);
  const total = totalResult.length > 0 ? totalResult[0].count : 0;
  // Type-safe transformation of dates and structure
  const transformedData = data.map((item) => ({
    ...item,
    post_created_at: toISOStringSafe(item.post_created_at),
  }));
  // Return complete response structure
  return {
    data: transformedData as ICommunityPost.ISummary[],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
