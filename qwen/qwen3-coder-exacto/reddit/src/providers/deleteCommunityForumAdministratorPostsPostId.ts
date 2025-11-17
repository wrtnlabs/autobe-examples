import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityForumAdministratorPostsPostId(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, check if the post exists
  const existingPost = await MyGlobal.prisma.community_forum_posts.findUnique({
    where: {
      id: props.postId,
    },
  });

  // If the post doesn't exist, throw a 404 error
  if (!existingPost) {
    throw new HttpException("Post not found", 404);
  }

  // Perform the hard delete operation
  await MyGlobal.prisma.community_forum_posts.delete({
    where: {
      id: props.postId,
    },
  });
}
