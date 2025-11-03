import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  // 1. Lookup comment
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.is_removed)
    throw new HttpException("Cannot edit a removed comment", 400);

  // 2. Check ownership
  if (comment.user_id !== props.user.id)
    throw new HttpException("You are not the author of this comment", 403);

  // 3. Enforce edit window: must be within 30 min of created_at
  const now = toISOStringSafe(new Date());
  const createdAt = toISOStringSafe(comment.created_at);
  const createdMs = new Date(createdAt).getTime();
  const nowMs = new Date(now).getTime();
  if (nowMs - createdMs > 30 * 60 * 1000)
    throw new HttpException("Editing window has expired", 403);

  // 4. Save edit history
  await MyGlobal.prisma.community_platform_comment_edit_histories.create({
    data: {
      id: v4(),
      comment_id: comment.id,
      editor_user_id: props.user.id,
      editor_user_session_id: props.user.session_id,
      prior_body: comment.body,
      edit_reason: null,
      created_at: now,
    },
  });

  // 5. Update the comment
  const updated = await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    post_id: updated.post_id,
    user_id: updated.user_id,
    user_session_id: updated.user_session_id,
    parent_comment_id: updated.parent_comment_id ?? undefined,
    body: updated.body,
    nest_depth: updated.nest_depth,
    is_removed: updated.is_removed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
