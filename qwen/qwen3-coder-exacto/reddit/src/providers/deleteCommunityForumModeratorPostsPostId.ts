import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityForumModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the post exists
  const post = await MyGlobal.prisma.community_forum_posts.findUnique({
    where: {
      id: props.postId,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Perform hard delete of the post
  // This will cascade to related records (votes, comments, karma) due to Prisma schema definition
  await MyGlobal.prisma.community_forum_posts.delete({
    where: {
      id: props.postId,
    },
  });
}
