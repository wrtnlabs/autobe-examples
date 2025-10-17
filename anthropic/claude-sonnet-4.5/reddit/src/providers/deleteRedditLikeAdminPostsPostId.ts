import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditLikeAdminPostsPostId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, postId } = props;

  // Verify post exists before attempting deletion
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: postId },
  });

  // Check if post is already soft-deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post has already been deleted", 400);
  }

  // Authorization: Admin role provides platform-wide deletion authority
  // No additional permission checks required - admin can delete any post
  // Role verification already handled by AdminAuth decorator

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: postId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
