import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserPostVotes(props: {
  user: UserPayload;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  const userId = props.user.id;
  const postId = props.body.community_platform_post_id;
  const isUpvote = props.body.is_upvote;
  // 1. Ensure post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      community_platform_user_id: true,
      deleted_at: true,
    },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found or deleted", 404);
  }

  // 2. Block self-vote (user voting on own post)
  if (post.community_platform_user_id === userId) {
    throw new HttpException("Cannot vote on your own post", 403);
  }

  // 3. Find existing vote (including deleted)
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: {
      community_platform_user_id_community_platform_post_id: {
        community_platform_user_id: userId,
        community_platform_post_id: postId,
      },
    },
  });

  const now = toISOStringSafe(new Date());

  // 4. Path: no vote exists (create one)
  if (!vote) {
    const created = await MyGlobal.prisma.community_platform_post_votes.create({
      data: {
        id: v4(),
        community_platform_user_id: userId,
        community_platform_post_id: postId,
        is_upvote: isUpvote,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      community_platform_user_id: created.community_platform_user_id,
      community_platform_post_id: created.community_platform_post_id,
      is_upvote: created.is_upvote,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
    };
  }

  // 5. Path: vote exists
  // a. If deleted_at is null and direction is same, toggle to soft-delete
  if (vote.deleted_at === null && vote.is_upvote === isUpvote) {
    const updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: {
        community_platform_user_id_community_platform_post_id: {
          community_platform_user_id: userId,
          community_platform_post_id: postId,
        },
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    return {
      id: updated.id,
      community_platform_user_id: updated.community_platform_user_id,
      community_platform_post_id: updated.community_platform_post_id,
      is_upvote: updated.is_upvote,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
    };
  }
  // b. If deleted_at is null and direction is different, update direction
  if (vote.deleted_at === null && vote.is_upvote !== isUpvote) {
    const updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: {
        community_platform_user_id_community_platform_post_id: {
          community_platform_user_id: userId,
          community_platform_post_id: postId,
        },
      },
      data: {
        is_upvote: isUpvote,
        updated_at: now,
      },
    });
    return {
      id: updated.id,
      community_platform_user_id: updated.community_platform_user_id,
      community_platform_post_id: updated.community_platform_post_id,
      is_upvote: updated.is_upvote,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
    };
  }
  // c. If deleted_at is NOT null (vote was toggled off):
  // If direction is same, reactivate (restore vote)
  // If direction is different, reactivate and update direction
  if (vote.deleted_at !== null) {
    const updated = await MyGlobal.prisma.community_platform_post_votes.update({
      where: {
        community_platform_user_id_community_platform_post_id: {
          community_platform_user_id: userId,
          community_platform_post_id: postId,
        },
      },
      data: {
        is_upvote: isUpvote,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: updated.id,
      community_platform_user_id: updated.community_platform_user_id,
      community_platform_post_id: updated.community_platform_post_id,
      is_upvote: updated.is_upvote,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
    };
  }
  // Should never be reached
  throw new HttpException("Unknown vote state", 500);
}
