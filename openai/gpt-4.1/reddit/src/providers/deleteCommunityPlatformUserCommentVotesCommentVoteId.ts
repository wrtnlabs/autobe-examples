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

export async function deleteCommunityPlatformUserCommentVotesCommentVoteId(props: {
  user: UserPayload;
  commentVoteId: string;
}): Promise<ICommunityPlatformCommentVote> {
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: props.commentVoteId },
      include: {
        comment: {
          include: {
            user: true,
            post: {
              include: {
                community: true,
                user: true,
              },
            },
          },
        },
        user: true,
      },
    });

  if (!vote || vote.deleted_at) {
    throw new HttpException(
      "Comment vote not found or already deleted",
      vote ? 409 : 404,
    );
  }
  if (vote.community_platform_user_id !== props.user.id) {
    throw new HttpException("Forbidden - not your vote", 403);
  }

  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_comment_votes.update(
    {
      where: { id: props.commentVoteId },
      data: { deleted_at: now },
      include: {
        comment: {
          include: {
            user: true,
            post: {
              include: {
                community: true,
                user: true,
              },
            },
          },
        },
        user: true,
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
        community: updated.comment.post.community
          ? {
              id: updated.comment.post.community.id,
              name: updated.comment.post.community.name,
              display_title: updated.comment.post.community.display_title,
              description: updated.comment.post.community.description,
              visibility: updated.comment.post.community.visibility,
              image_url: updated.comment.post.community.image_url ?? undefined,
              status: updated.comment.post.community.status,
            }
          : undefined,
        user_id: updated.comment.post.user_id,
        user: updated.comment.post.user
          ? { id: updated.comment.post.user.id }
          : undefined,
      },
      parent_id: updated.comment.parent_id ?? undefined,
      created_at: toISOStringSafe(updated.comment.created_at),
    },
    user: { id: updated.user.id },
    vote_type: typia.assert<"up" | "down">(updated.vote_type),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
