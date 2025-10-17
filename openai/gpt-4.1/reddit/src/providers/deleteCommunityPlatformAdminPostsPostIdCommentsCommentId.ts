import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminPostsPostIdCommentsCommentId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 1. Fetch comment by id and parent post, ensure existence, not deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: props.commentId,
      community_platform_post_id: props.postId,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 409);
  }

  // 2. Admins: always allowed, no further check needed

  // 3. Soft-delete the comment
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: now },
  });

  // 4. No recursive delete/orphaning: scenario expects only target comment to be affected

  // 5. Audit logging
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: props.admin.id,
      action_type: "delete",
      target_table: "community_platform_comments",
      target_id: props.commentId,
      details: JSON.stringify({ post_id: props.postId }),
      created_at: now,
    },
  });
}
