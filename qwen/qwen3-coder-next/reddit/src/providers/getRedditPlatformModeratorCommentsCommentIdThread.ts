import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformModeratorCommentsCommentIdThread(props: {
  moderator: ModeratorPayload;
  commentId: string;
}): Promise<IRedditPlatformComment> {
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: {
      id: props.commentId,
    },
    select: {
      id: true,
      author_id: true,
      post_id: true,
      parent_comment_id: true,
      content: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          content: true,
        },
      },
      parentComment: {
        select: {
          id: true,
          content: true,
          author_id: true,
        },
      },
      childComments: {
        select: {
          id: true,
          author_id: true,
          post_id: true,
          parent_comment_id: true,
          content: true,
          vote_score: true,
          comment_count: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          author: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
          parentComment: {
            select: {
              id: true,
            },
          },
          childComments: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  const transformComment = (record: any): IRedditPlatformComment => ({
    id: record.id,
    author_id: record.author_id,
    post_id: record.post_id,
    parent_comment_id: record.parent_comment_id,
    content: record.content,
    vote_score: record.vote_score,
    comment_count: record.comment_count,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  });
  const transformedComment = transformComment(comment);
  return {
    ...transformedComment,
    childComments: comment.childComments.map(transformComment),
  };
}
