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

export async function getCommunityPlatformUserPostsFeedPopular(props: {
  user: UserPayload;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      community: { select: { name: true } },
      authorUser: { select: { username: true } },
      authorModerator: { select: { username: true } },
      postVotes: { where: { deleted_at: null }, select: { vote_type: true } },
      postComments: { where: { deleted_at: null }, select: { id: true } },
    },
  });
  const data = posts.map((post) => {
    const upvotes = post.postVotes.filter(
      (v) => v.vote_type === "upvote",
    ).length;
    const downvotes = post.postVotes.filter(
      (v) => v.vote_type === "downvote",
    ).length;
    const voteScore = upvotes - downvotes;
    const commentCount = post.postComments.length;
    const authorUsername =
      post.authorUser?.username ?? post.authorModerator?.username ?? null;
    return {
      id: post.id,
      title: post.title,
      post_type: post.post_type,
      community_name: post.community.name,
      author_username: authorUsername,
      vote_score: voteScore,
      comment_count: commentCount,
      created_at: toISOStringSafe(post.created_at),
      updated_at: toISOStringSafe(post.updated_at),
    };
  });
  // Sort lexicographically on created_at ISO string to avoid native Date
  data.sort((a, b) => {
    if (b.vote_score !== a.vote_score) return b.vote_score - a.vote_score;
    return b.created_at < a.created_at
      ? -1
      : b.created_at > a.created_at
        ? 1
        : 0;
  });
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: { deleted_at: null },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
