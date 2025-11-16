import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminPostsPostId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingPost = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
  });
  if (!existingPost) {
    throw new HttpException("Post not found", 404);
  }
  await MyGlobal.prisma.reddit_community_posts.delete({
    where: { id: props.postId },
  });
}
