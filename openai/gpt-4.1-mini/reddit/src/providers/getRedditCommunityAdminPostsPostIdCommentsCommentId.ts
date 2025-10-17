import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminPostsPostIdCommentsCommentId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityComment> {
  const { admin, postId, commentId } = props;

  const comment =
    await MyGlobal.prisma.reddit_community_comments.findFirstOrThrow({
      where: {
        id: commentId,
        reddit_community_post_id: postId,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_community_post_id: true,
        parent_comment_id: true,
        author_member_id: true,
        author_guest_id: true,
        body_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: comment.id,
    reddit_community_post_id: comment.reddit_community_post_id,
    parent_comment_id: comment.parent_comment_id ?? undefined,
    author_member_id: comment.author_member_id ?? undefined,
    author_guest_id: comment.author_guest_id ?? undefined,
    body_text: comment.body_text,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
  };
}
