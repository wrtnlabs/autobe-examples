import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteRedditCommunityRegisteredUserRedditCommunityPostsPostId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
  });

  if (post === null || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }

  if (post.reddit_community_registereduser_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.reddit_community_posts.delete({
    where: { id: props.postId },
  });
}
