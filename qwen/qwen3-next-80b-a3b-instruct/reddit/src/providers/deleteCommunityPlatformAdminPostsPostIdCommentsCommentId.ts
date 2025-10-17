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
  // Find the comment to ensure it exists
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
    });

  // Authorization: Must be comment author or admin
  if (comment.author_id !== props.admin.id) {
    throw new HttpException(
      "Forbidden: Only the comment author or an admin can delete this comment",
      403,
    );
  }

  // Hard delete the comment (cascades to replies due to foreign key relationship)
  await MyGlobal.prisma.community_platform_comments.delete({
    where: { id: props.commentId },
  });
}
