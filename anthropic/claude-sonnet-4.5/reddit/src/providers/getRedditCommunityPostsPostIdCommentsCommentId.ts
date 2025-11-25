import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";

export async function getRedditCommunityPostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityComment> {
  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: {
      id: props.commentId,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.reddit_community_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      404,
    );
  }

  return {
    id: comment.id,
    body: comment.body,
    reddit_community_post_id: comment.reddit_community_post_id,
    reddit_community_member_id: comment.reddit_community_member_id,
    parent_comment_id: comment.parent_comment_id,
    depth: comment.depth,
    edited: comment.edited,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
  };
}
