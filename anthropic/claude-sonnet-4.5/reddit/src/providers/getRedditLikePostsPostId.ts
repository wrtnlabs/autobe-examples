import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function getRedditLikePostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePost> {
  const { postId } = props;

  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: postId },
    select: {
      id: true,
      type: true,
      title: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: post.id as string & tags.Format<"uuid">,
    type: post.type,
    title: post.title,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
  };
}
