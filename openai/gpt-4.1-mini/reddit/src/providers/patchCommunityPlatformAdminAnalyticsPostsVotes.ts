import { ICommunityPlatformPostVoteOfUserAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUserAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostVoteOfUserAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfUserAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminAnalyticsPostsVotes(props: {
  admin: AdminPayload;
  body: ICommunityPlatformPostVoteOfUserAnalytic.IRequest;
}): Promise<IPageICommunityPlatformPostVoteOfUserAnalytic.ISummary> {
  const prisma = MyGlobal.prisma;
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const dataRaw: {
    post_id: string;
    title: string | null;
    author_id: string;
    created_at: Date;
    user_upvotes: number;
    user_downvotes: number;
    moderator_upvotes: number;
    moderator_downvotes: number;
    total_votes: number;
  }[] = await prisma.$queryRaw(Prisma.sql`
    SELECT
      p.id AS post_id,
      p.title AS title,
      p.author_id AS author_id,
      p.created_at AS created_at,
      COALESCE(SUM(CASE WHEN pvu.is_upvote = TRUE THEN 1 ELSE 0 END), 0) AS user_upvotes,
      COALESCE(SUM(CASE WHEN pvu.is_upvote = FALSE THEN 1 ELSE 0 END), 0) AS user_downvotes,
      COALESCE(SUM(CASE WHEN pvm.is_upvote = TRUE THEN 1 ELSE 0 END), 0) AS moderator_upvotes,
      COALESCE(SUM(CASE WHEN pvm.is_upvote = FALSE THEN 1 ELSE 0 END), 0) AS moderator_downvotes,
      COALESCE(
        SUM(CASE WHEN pvu.is_upvote IN (TRUE, FALSE) THEN 1 ELSE 0 END) +
        SUM(CASE WHEN pvm.is_upvote IN (TRUE, FALSE) THEN 1 ELSE 0 END), 0
      ) AS total_votes
    FROM community_platform_posts p
    LEFT JOIN community_platform_post_vote_of_users pvu ON pvu.post_id = p.id
    LEFT JOIN community_platform_post_vote_of_moderators pvm ON pvm.post_id = p.id
    GROUP BY p.id
    ORDER BY total_votes DESC, p.created_at DESC
    LIMIT ${limit} OFFSET ${skip}
  `);
  const totalPosts = await prisma.community_platform_posts.count();
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalPosts,
      pages: Math.ceil(totalPosts / limit),
    },
    data: dataRaw.map((post) => ({
      post_id: post.post_id,
      title: post.title ?? null,
      author_id: post.author_id,
      created_at: toISOStringSafe(post.created_at) as string &
        tags.Format<"date-time">,
      user_upvotes: post.user_upvotes,
      user_downvotes: post.user_downvotes,
      moderator_upvotes: post.moderator_upvotes,
      moderator_downvotes: post.moderator_downvotes,
      total_votes: post.total_votes,
    })),
  };
}
