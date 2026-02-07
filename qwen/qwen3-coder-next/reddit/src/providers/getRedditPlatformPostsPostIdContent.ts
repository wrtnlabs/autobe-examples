import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostsPostIdContent(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPost.IContent> {
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      content: {
        select: {
          content_text: true,
          url: true,
          image_url: true,
        },
      },
    },
  });
  if (!post || !post.content) {
    throw new HttpException("Post not found", 404);
  }
  return {
    content_text: post.content.content_text,
    url: post.content.url,
    image_url: post.content.image_url,
  };
}
