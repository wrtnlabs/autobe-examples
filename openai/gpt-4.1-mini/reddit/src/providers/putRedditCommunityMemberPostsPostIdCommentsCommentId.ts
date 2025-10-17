import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putRedditCommunityMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  const { member, postId, commentId, body } = props;

  // Find the comment to update
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: commentId },
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

  // Verify comment belongs to correct post
  if (comment.reddit_community_post_id !== postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      404,
    );
  }

  // Verify comment not deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted comment", 403);
  }

  // Verify ownership
  if (comment.author_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: only author can update comment",
      403,
    );
  }

  // Prepare updated_at timestamp
  const now = toISOStringSafe(new Date());

  // Update the comment
  const updated = await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: commentId },
    data: {
      body_text: body.body_text ?? undefined,
      updated_at: now,
    },
  });

  // Return updated comment with proper date conversions
  return {
    id: updated.id,
    reddit_community_post_id: updated.reddit_community_post_id,
    parent_comment_id: updated.parent_comment_id ?? null,
    author_member_id: updated.author_member_id ?? null,
    author_guest_id: updated.author_guest_id ?? null,
    body_text: updated.body_text,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
