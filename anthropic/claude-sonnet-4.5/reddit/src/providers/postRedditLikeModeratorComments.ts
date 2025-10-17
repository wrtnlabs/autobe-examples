import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditLikeModeratorComments(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeComment.ICreate;
}): Promise<IRedditLikeComment> {
  const { moderator, body } = props;

  // Validate post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_like_posts.findFirst({
    where: {
      id: body.reddit_like_post_id,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }

  // Calculate depth and validate parent comment if provided
  let depth = 0;
  if (body.reddit_like_parent_comment_id !== undefined) {
    const parentComment = await MyGlobal.prisma.reddit_like_comments.findFirst({
      where: {
        id: body.reddit_like_parent_comment_id,
        reddit_like_post_id: body.reddit_like_post_id,
        deleted_at: null,
      },
    });

    if (!parentComment) {
      throw new HttpException(
        "Parent comment not found or does not belong to this post",
        404,
      );
    }

    depth = parentComment.depth + 1;

    if (depth > 10) {
      throw new HttpException(
        "Maximum comment nesting depth of 10 levels exceeded",
        400,
      );
    }
  }

  // Prepare timestamp and ID
  const now = toISOStringSafe(new Date());
  const commentId = v4() as string & tags.Format<"uuid">;

  // Create comment
  await MyGlobal.prisma.reddit_like_comments.create({
    data: {
      id: commentId,
      reddit_like_post_id: body.reddit_like_post_id,
      reddit_like_parent_comment_id:
        body.reddit_like_parent_comment_id ?? undefined,
      reddit_like_member_id: moderator.id,
      content_text: body.content_text,
      depth: depth,
      vote_score: 0,
      edited: false,
      created_at: now,
      updated_at: now,
    },
  });

  // Return using prepared values
  return {
    id: commentId,
    reddit_like_post_id: body.reddit_like_post_id,
    reddit_like_parent_comment_id: body.reddit_like_parent_comment_id,
    content_text: body.content_text,
    depth: depth,
    vote_score: 0,
    edited: false,
    created_at: now,
    updated_at: now,
  };
}
