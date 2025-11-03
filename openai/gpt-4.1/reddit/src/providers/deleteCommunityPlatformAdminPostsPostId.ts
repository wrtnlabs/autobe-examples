import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminPostsPostId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find post by id
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (!post) throw new HttpException("Post not found", 404);
  if (post.deleted_at !== null)
    throw new HttpException("Post already deleted", 400);
  await MyGlobal.prisma.community_platform_posts.delete({
    where: { id: props.postId },
  });
}
