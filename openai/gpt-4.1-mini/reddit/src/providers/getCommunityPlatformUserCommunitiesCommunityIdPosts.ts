import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserCommunitiesCommunityIdPosts(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
      select: { id: true },
    });
  if (!community) {
    return {
      data: [],
      pagination: { current: page, limit, records: 0, pages: 0 },
    };
  }
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: { community_id: props.communityId, deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      post_type: true,
      created_at: true,
      authorUser: { select: { username: true } },
      authorModerator: { select: { username: true } },
    },
  });
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: { community_id: props.communityId, deleted_at: null },
  });
  const postIds = posts.map((post) => post.id);
  // Aggregate vote scores per post
  const voteScoresRaw =
    await MyGlobal.prisma.community_platform_post_votes.findMany({
      where: { post_id: { in: postIds } },
      select: { post_id: true, score: true },
    });
  const voteScoreMap: Record<string, number> = {};
  for (const vote of voteScoresRaw) {
    voteScoreMap[vote.post_id] = (voteScoreMap[vote.post_id] ?? 0) + vote.score;
  }
  // Aggregate comment counts per post
  const commentCountsRaw =
    await MyGlobal.prisma.community_platform_post_comments.groupBy({
      by: ["post_id"],
      where: { post_id: { in: postIds } },
      _count: { post_id: true },
    });
  const commentCountMap: Record<string, number> = {};
  for (const cc of commentCountsRaw) {
    commentCountMap[cc.post_id] = cc._count.post_id ?? 0;
  }
  const data: ICommunityPlatformPost.ISummary[] = posts.map((post) => {
    const authorUsername =
      post.authorUser?.username ?? post.authorModerator?.username ?? null;
    return {
      id: post.id,
      title: post.title,
      post_type: post.post_type,
      author_username: authorUsername,
      vote_score: voteScoreMap[post.id] ?? 0,
      comment_count: commentCountMap[post.id] ?? 0,
      created_at: toISOStringSafe(post.created_at),
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
