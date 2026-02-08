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

export async function patchCommunityPlatformUserPosts(props: {
  user: UserPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Use default page and limit as pagination properties do not exist in IRequest
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const isAuthenticated = props.user?.type === "user";
  // Build prisma where filter - only deleted_at is filterable given props.body schema
  const whereInput: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
  };
  // Without community_id and other filters available in IRequest, no extra filters are applied
  // Enforce authenticated for home feed as per original logic, but since no community_id, home feed is always true
  const isHomeFeed = true;
  if (isHomeFeed && !isAuthenticated) {
    throw new HttpException("Authentication required for home feed", 401);
  }
  // Ordering default as no sort property in IRequest
  const orderBy: Prisma.community_platform_postsOrderByWithRelationInput[] = [
    { created_at: "desc" },
  ];
  // Fetch posts from database
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderBy.length === 1 ? orderBy[0] : orderBy,
    select: {
      id: true,
      title: true,
      post_type: true,
      community_id: true,
      author_user_id: true,
      author_moderator_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  // Get posts IDs
  const postIds = posts.map((post) => post.id);
  // Fetch votes grouped by post_id and vote_type
  const votesRaw = await MyGlobal.prisma.community_platform_post_votes.groupBy({
    by: ["post_id", "vote_type"],
    where: { post_id: { in: postIds } },
    _count: { _all: true },
  });
  // Aggregate votes
  const voteMap: Record<
    string,
    {
      voteCount: number;
      voteScore: number;
    }
  > = {};
  for (const vote of votesRaw) {
    const id = vote.post_id;
    if (!(id in voteMap)) {
      voteMap[id] = { voteCount: 0, voteScore: 0 };
    }
    voteMap[id].voteCount += vote._count._all;
    // vote_type might be string, so parse to number
    const voteTypeNum =
      typeof vote.vote_type === "string"
        ? parseInt(vote.vote_type, 10)
        : vote.vote_type;
    if (voteTypeNum === 1) {
      voteMap[id].voteScore += vote._count._all;
    } else if (voteTypeNum === 2) {
      voteMap[id].voteScore -= vote._count._all;
    }
  }
  // Map posts with votes and convert Dates
  const data = posts.map((post) => {
    const vote = voteMap[post.id] ?? { voteCount: 0, voteScore: 0 };
    const created_at = toISOStringSafe(post.created_at);
    const updated_at = post.updated_at
      ? toISOStringSafe(post.updated_at)
      : null;
    // Compose author_id and author_type from post
    let author_id: string | null = null;
    let author_type: "user" | "moderator" | null = null;
    if (post.author_user_id) {
      author_id = post.author_user_id;
      author_type = "user";
    } else if (post.author_moderator_id) {
      author_id = post.author_moderator_id;
      author_type = "moderator";
    }
    return {
      id: post.id,
      title: post.title,
      post_type: post.post_type,
      author_id,
      author_type,
      community_id: post.community_id,
      created_at,
      updated_at,
      vote_count: vote.voteCount,
      vote_score: vote.voteScore,
      content_preview: null,
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
