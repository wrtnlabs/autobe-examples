import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserPostVotes(props: {
  user: UserPayload;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  const { user, body } = props;

  // Check valid vote_type
  if (body.vote_type !== "up" && body.vote_type !== "down") {
    throw new HttpException("Invalid vote_type: must be 'up' or 'down'", 400);
  }

  // Check the target post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: body.community_platform_post_id, deleted_at: null },
    select: {
      id: true,
      community_id: true,
      user_id: true,
      community: {
        select: {
          id: true,
          name: true,
          display_title: true,
          description: true,
          visibility: true,
          image_url: true,
          status: true,
        },
      },
      user: {
        select: { id: true },
      },
    },
  });
  if (!post) {
    throw new HttpException("Target post does not exist.", 404);
  }

  // Check for existing vote for this user+post
  const existingVote =
    await MyGlobal.prisma.community_platform_post_votes.findFirst({
      where: {
        community_platform_post_id: body.community_platform_post_id,
        community_platform_user_id: user.id,
        deleted_at: null,
      },
    });
  if (existingVote) {
    throw new HttpException("User has already voted on this post.", 400);
  }

  // Check for previously deleted vote (soft-deleted)
  const previousVote =
    await MyGlobal.prisma.community_platform_post_votes.findFirst({
      where: {
        community_platform_post_id: body.community_platform_post_id,
        community_platform_user_id: user.id,
        deleted_at: { not: null },
      },
    });

  let voteRow;
  const now = toISOStringSafe(new Date());
  if (previousVote) {
    voteRow = await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: previousVote.id },
      data: { vote_type: body.vote_type, deleted_at: null, updated_at: now },
    });
  } else {
    voteRow = await MyGlobal.prisma.community_platform_post_votes.create({
      data: {
        id: v4(),
        community_platform_post_id: body.community_platform_post_id,
        community_platform_user_id: user.id,
        vote_type: body.vote_type,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }

  // Compose the post and user summaries as required by the DTO
  const result: ICommunityPlatformPostVote = {
    id: voteRow.id,
    vote_type: voteRow.vote_type,
    created_at: toISOStringSafe(voteRow.created_at),
    updated_at: toISOStringSafe(voteRow.updated_at),
    deleted_at:
      voteRow.deleted_at !== null && voteRow.deleted_at !== undefined
        ? toISOStringSafe(voteRow.deleted_at)
        : null,
    post: {
      id: post.id,
      community_id: post.community_id,
      user_id: post.user_id,
      community: post.community
        ? {
            id: post.community.id,
            name: post.community.name,
            display_title: post.community.display_title,
            description: post.community.description,
            visibility: post.community.visibility,
            image_url: post.community.image_url ?? null,
            status: post.community.status,
          }
        : undefined,
      user: post.user ? { id: post.user.id } : undefined,
    },
    user: { id: user.id },
  };
  return result;
}
