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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorPostVotesPostVoteId(props: {
  moderator: ModeratorPayload;
  postVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  const vote = await MyGlobal.prisma.community_platform_post_votes.findUnique({
    where: { id: props.postVoteId },
    include: {
      post: {
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
            select: {
              id: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!vote) {
    throw new HttpException("Post vote not found.", 404);
  }

  const result: ICommunityPlatformPostVote = {
    id: vote.id,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at:
      vote.deleted_at === null ? null : toISOStringSafe(vote.deleted_at),
    post: vote.post
      ? {
          id: vote.post.id,
          community_id: vote.post.community_id,
          community: vote.post.community
            ? {
                id: vote.post.community.id,
                name: vote.post.community.name,
                display_title: vote.post.community.display_title,
                description: vote.post.community.description,
                visibility: vote.post.community.visibility,
                image_url:
                  vote.post.community.image_url === null
                    ? null
                    : vote.post.community.image_url,
                status: vote.post.community.status,
              }
            : undefined,
          user_id: vote.post.user_id,
          user: vote.post.user
            ? {
                id: vote.post.user.id,
              }
            : undefined,
        }
      : undefined,
    user: vote.user ? { id: vote.user.id } : undefined,
  };

  return result;
}
