import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminPostsPostIdRestore(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePost> {
  const { postId } = props;

  const post = await MyGlobal.prisma.reddit_like_posts.findFirst({
    where: {
      id: postId,
      deleted_at: { not: null },
    },
  });

  if (!post) {
    throw new HttpException("Post not found or already restored", 404);
  }

  const restored = await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: postId },
    data: {
      deleted_at: null,
    },
  });

  return {
    id: restored.id,
    type: restored.type,
    title: restored.title,
    created_at: toISOStringSafe(restored.created_at),
    updated_at: toISOStringSafe(restored.updated_at),
  };
}
