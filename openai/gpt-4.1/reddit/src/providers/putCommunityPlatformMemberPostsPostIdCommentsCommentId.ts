import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  // Find target comment, ensure exists and matches post
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment || comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Comment not found in this post", 404);
  }
  // Only the author can edit
  if (comment.community_platform_member_id !== props.member.id) {
    throw new HttpException("Only the author can edit this comment", 403);
  }
  // Insert edit history BEFORE update
  await MyGlobal.prisma.community_platform_comment_edits.create({
    data: {
      id: v4(),
      community_platform_comment_id: comment.id,
      edited_by_member_id: props.member.id,
      old_body: comment.body,
      edited_at: toISOStringSafe(new Date()),
    },
  });
  // Update comment
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body,
      updated_at: now,
    },
  });
  // Return updated comment, formatting all date fields
  return {
    id: updated.id,
    community_platform_post_id: updated.community_platform_post_id,
    community_platform_member_id: updated.community_platform_member_id,
    parent_id: updated.parent_id === null ? undefined : updated.parent_id,
    body: updated.body,
    nesting_level: updated.nesting_level,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
