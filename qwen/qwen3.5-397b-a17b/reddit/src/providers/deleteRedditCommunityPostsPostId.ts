import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post already deleted", 400);
  }
  await MyGlobal.prisma.reddit_community_posts.delete({
    where: { id: props.postId },
  });
}
