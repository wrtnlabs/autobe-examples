import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPost";

export async function getPoliticalForumPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IPoliticalForumPost> {
  const post = await MyGlobal.prisma.political_forum_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  return JSON.stringify({
    id: post.id,
    title: post.title,
    body: post.body,
    created_at: toISOStringSafe(post.created_at),
    updated_at: post.updated_at ? toISOStringSafe(post.updated_at) : null,
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
    edit_count: post.edit_count,
    citizen_id: post.citizen_id,
    post_state_id: post.post_state_id,
  });
}
