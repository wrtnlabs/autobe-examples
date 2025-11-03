import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserCommentVotes(props: {
  user: UserPayload;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformCommentVote> {
  const { user, body } = props;

  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: body.community_platform_comment_id },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.user_id === user.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }

  const existing =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        community_platform_user_id_community_platform_comment_id: {
          community_platform_user_id: user.id,
          community_platform_comment_id: body.community_platform_comment_id,
        },
      },
    });

  const now = toISOStringSafe(new Date());

  if (!existing) {
    const created =
      await MyGlobal.prisma.community_platform_comment_votes.create({
        data: {
          id: v4(),
          community_platform_user_id: user.id,
          community_platform_comment_id: body.community_platform_comment_id,
          is_upvote: body.is_upvote,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: created.id,
      community_platform_user_id: created.community_platform_user_id,
      community_platform_comment_id: created.community_platform_comment_id,
      is_upvote: created.is_upvote,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null
          ? toISOStringSafe(created.deleted_at)
          : null,
    };
  }

  if (existing.deleted_at !== null) {
    const updated =
      await MyGlobal.prisma.community_platform_comment_votes.update({
        where: { id: existing.id },
        data: {
          is_upvote: body.is_upvote,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: updated.id,
      community_platform_user_id: updated.community_platform_user_id,
      community_platform_comment_id: updated.community_platform_comment_id,
      is_upvote: updated.is_upvote,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at !== null
          ? toISOStringSafe(updated.deleted_at)
          : null,
    };
  }

  if (existing.is_upvote === body.is_upvote) {
    return {
      id: existing.id,
      community_platform_user_id: existing.community_platform_user_id,
      community_platform_comment_id: existing.community_platform_comment_id,
      is_upvote: existing.is_upvote,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
      deleted_at:
        existing.deleted_at !== null
          ? toISOStringSafe(existing.deleted_at)
          : null,
    };
  }

  const changed = await MyGlobal.prisma.community_platform_comment_votes.update(
    {
      where: { id: existing.id },
      data: {
        is_upvote: body.is_upvote,
        updated_at: now,
      },
    },
  );
  return {
    id: changed.id,
    community_platform_user_id: changed.community_platform_user_id,
    community_platform_comment_id: changed.community_platform_comment_id,
    is_upvote: changed.is_upvote,
    created_at: toISOStringSafe(changed.created_at),
    updated_at: toISOStringSafe(changed.updated_at),
    deleted_at:
      changed.deleted_at !== null ? toISOStringSafe(changed.deleted_at) : null,
  };
}
