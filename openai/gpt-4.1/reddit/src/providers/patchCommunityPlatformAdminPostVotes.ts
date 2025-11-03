import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminPostVotes(props: {
  admin: AdminPayload;
  body: ICommunityPlatformPostVote.IRequest;
}): Promise<IPageICommunityPlatformPostVote.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where filter
  const createdAtFilter =
    body.created_at_min !== undefined && body.created_at_max !== undefined
      ? { gte: body.created_at_min, lte: body.created_at_max }
      : body.created_at_min !== undefined
        ? { gte: body.created_at_min }
        : body.created_at_max !== undefined
          ? { lte: body.created_at_max }
          : undefined;
  const updatedAtFilter =
    body.updated_at_min !== undefined && body.updated_at_max !== undefined
      ? { gte: body.updated_at_min, lte: body.updated_at_max }
      : body.updated_at_min !== undefined
        ? { gte: body.updated_at_min }
        : body.updated_at_max !== undefined
          ? { lte: body.updated_at_max }
          : undefined;
  const where: Record<string, unknown> = {
    ...(body.user_id !== undefined &&
      body.user_id !== null && { community_platform_user_id: body.user_id }),
    ...(body.post_id !== undefined &&
      body.post_id !== null && { community_platform_post_id: body.post_id }),
    ...(body.is_upvote !== undefined && { is_upvote: body.is_upvote }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(updatedAtFilter !== undefined && { updated_at: updatedAtFilter }),
    ...(body.deleted === true && { deleted_at: { not: null } }),
    ...(body.deleted === false && { deleted_at: null }),
  };

  // Fetch just the essential vote rows
  const [votes, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_votes.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_post_votes.count({ where }),
  ]);

  // Gather all unique user and post IDs
  const userIds = Array.from(
    new Set(votes.map((v) => v.community_platform_user_id)),
  );
  const postIds = Array.from(
    new Set(votes.map((v) => v.community_platform_post_id)),
  );

  // Batch fetch users
  const users = await MyGlobal.prisma.community_platform_users.findMany({
    where: { id: { in: userIds } },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  // Batch fetch posts
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: { id: { in: postIds } },
  });
  const postMap = new Map(posts.map((p) => [p.id, p]));

  // Gather other information needed from posts (user & community)
  const postUserIds = Array.from(
    new Set(posts.map((p) => p.community_platform_user_id)),
  );
  const postCommunityIds = Array.from(
    new Set(posts.map((p) => p.community_platform_community_id)),
  );
  const postUsers = await MyGlobal.prisma.community_platform_users.findMany({
    where: { id: { in: postUserIds } },
  });
  const postUserMap = new Map(postUsers.map((u) => [u.id, u]));
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: { id: { in: postCommunityIds } },
    });
  const communityMap = new Map(communities.map((c) => [c.id, c]));

  const data = votes.map((vote) => {
    const user = userMap.get(vote.community_platform_user_id);
    const post = postMap.get(vote.community_platform_post_id);
    const postAuthor = post
      ? postUserMap.get(post.community_platform_user_id)
      : null;
    const community = post
      ? communityMap.get(post.community_platform_community_id)
      : null;
    return {
      id: vote.id,
      user: user
        ? { id: user.id, display_name: user.display_name }
        : {
            id: vote.community_platform_user_id,
            display_name: "(unknown user)",
          },
      post:
        post && postAuthor && community
          ? {
              id: post.id,
              community: {
                id: community.id,
                name: community.name,
                description: community.description,
              },
              user: {
                id: postAuthor.id,
                display_name: postAuthor.display_name,
              },
              title: post.title,
              status: post.status,
              created_at: toISOStringSafe(post.created_at),
              updated_at: toISOStringSafe(post.updated_at),
            }
          : {
              id: vote.community_platform_post_id,
              community: { id: "", name: "", description: "" },
              user: { id: "", display_name: "" },
              title: "",
              status: "",
              created_at: toISOStringSafe(new Date()),
              updated_at: toISOStringSafe(new Date()),
            },
      is_upvote: vote.is_upvote,
      created_at: toISOStringSafe(vote.created_at),
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
