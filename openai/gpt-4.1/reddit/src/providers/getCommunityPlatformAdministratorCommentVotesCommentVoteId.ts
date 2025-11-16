import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorCommentVotesCommentVoteId(props: {
  administrator: AdministratorPayload;
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVote> {
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: props.commentVoteId },
      include: {
        user: true,
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
      },
    });

  if (!vote) {
    throw new HttpException("Comment vote not found", 404);
  }

  const mapped: ICommunityPlatformCommentVote = {
    id: vote.id,
    comment: {
      id: vote.comment.id,
      user: { id: vote.comment.user.id },
      post: {
        id: vote.comment.post.id,
        community_id: vote.comment.post.community_id,
        user_id: vote.comment.post.user_id,
        community: vote.comment.post.community
          ? {
              id: vote.comment.post.community.id,
              name: vote.comment.post.community.name,
              display_title: vote.comment.post.community.display_title,
              description: vote.comment.post.community.description,
              visibility: vote.comment.post.community.visibility,
              image_url:
                typeof vote.comment.post.community.image_url === "string"
                  ? vote.comment.post.community.image_url
                  : undefined,
              status: vote.comment.post.community.status,
            }
          : undefined,
        user: vote.comment.post.user
          ? { id: vote.comment.post.user.id }
          : undefined,
      },
      parent_id:
        typeof vote.comment.parent_id === "string"
          ? vote.comment.parent_id
          : undefined,
      created_at: toISOStringSafe(vote.comment.created_at),
    },
    user: { id: vote.user.id },
    vote_type: vote.vote_type === "up" ? "up" : "down",
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : undefined,
  };

  return mapped;
}
