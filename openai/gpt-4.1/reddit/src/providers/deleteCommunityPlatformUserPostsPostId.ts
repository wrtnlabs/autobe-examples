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
  // Locate the post by id and ensure it is not already deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found or already deleted.", 404);
  }
  if (post.user_id !== props.user.id) {
    throw new HttpException("You are not authorized to delete this post.", 403);
  }
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
