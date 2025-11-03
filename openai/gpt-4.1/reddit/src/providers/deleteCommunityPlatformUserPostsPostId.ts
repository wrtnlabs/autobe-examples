import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, postId } = props;
  // 1. Fetch post and check existence (must not be soft deleted)
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      community_platform_user_id: true,
      deleted_at: true,
    },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found or already deleted", 404);
  }
  // 2. Authorization: Only post author may delete via this endpoint
  if (post.community_platform_user_id !== user.id) {
    throw new HttpException(
      "Forbidden: Only the post author can delete this post",
      403,
    );
  }
  // 3. Hard delete: triggers cascading deletes for all linked records
  await MyGlobal.prisma.community_platform_posts.delete({
    where: { id: postId },
  });
  return;
}
