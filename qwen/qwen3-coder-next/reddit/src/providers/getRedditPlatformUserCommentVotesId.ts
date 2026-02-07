import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
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

export async function getRedditPlatformUserCommentVotesId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommentVote> {
  const vote = await MyGlobal.prisma.reddit_platform_comment_votes.findUnique({
    where: { id: props.id },
    select: {
      id: true,
      user_id: true,
      comment_id: true,
      vote_type: true,
      created_at: true,
      updated_at: true,
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
        },
      },
      comment: {
        select: {
          id: true,
          content: true,
          post_id: true,
          author_id: true,
          vote_score: true,
          comment_count: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  if (!vote) {
    throw new HttpException("Comment vote not found", 404);
  }
  return {
    id: vote.id as string & tags.Format<"uuid">,
    user_id: vote.user_id as string & tags.Format<"uuid">,
    comment_id: vote.comment_id as string & tags.Format<"uuid">,
    vote_type: vote.vote_type,
    created_at: toISOStringSafe(vote.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(vote.updated_at) as string &
      tags.Format<"date-time">,
    user: {
      id: vote.user.id as string & tags.Format<"uuid">,
      username: vote.user.username,
      display_name:
        vote.user.display_name === null
          ? null
          : (vote.user.display_name as string),
    },
    comment: {
      id: vote.comment.id as string & tags.Format<"uuid">,
      content: vote.comment.content,
      post_id: vote.comment.post_id as string & tags.Format<"uuid">,
      author_id: vote.comment.author_id as string & tags.Format<"uuid">,
      vote_score: vote.comment.vote_score,
      comment_count: vote.comment.comment_count,
      created_at: toISOStringSafe(vote.comment.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(vote.comment.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: vote.comment.deleted_at
        ? (toISOStringSafe(vote.comment.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    },
  };
}
