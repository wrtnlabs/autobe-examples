import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserCommentVotesCommentVoteId(props: {
  user: UserPayload;
  commentVoteId: string;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformCommentVote> {
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: props.commentVoteId },
    });

  if (!vote) {
    throw new HttpException("Comment vote not found.", 404);
  }
  if (vote.community_platform_user_id !== props.user.id) {
    throw new HttpException("You are not authorized to update this vote.", 403);
  }

  const nowIso = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_comment_votes.update(
    {
      where: { id: props.commentVoteId },
      data: {
        vote_type: props.body.vote_type,
        updated_at: nowIso,
      },
      include: {
        comment: {
          select: {
            id: true,
            user: { select: { id: true } },
            post: { select: { id: true, community_id: true, user_id: true } },
            parent_id: true,
            created_at: true,
          },
        },
        user: { select: { id: true } },
      },
    },
  );

  return {
    id: updated.id,
    comment: {
      id: updated.comment.id,
      user: { id: updated.comment.user.id },
      post: {
        id: updated.comment.post.id,
        community_id: updated.comment.post.community_id,
        user_id: updated.comment.post.user_id,
      },
      parent_id:
        updated.comment.parent_id === null
          ? undefined
          : updated.comment.parent_id,
      created_at: toISOStringSafe(updated.comment.created_at),
    },
    user: {
      id: updated.user.id,
    },
    vote_type: updated.vote_type === "up" ? "up" : "down",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || typeof updated.deleted_at === "undefined"
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
