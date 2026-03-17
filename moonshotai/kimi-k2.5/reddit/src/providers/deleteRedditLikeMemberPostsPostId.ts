import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberPostsPostId(props: {
  member: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the post and verify it exists
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, author_id: true },
  });
  // Verify the requesting member is the author
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete: mark as deleted and set deletion timestamp
  await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: props.postId },
    data: {
      is_deleted: true,
      deleted_at: new Date(),
    },
  });
}
