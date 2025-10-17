import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";

export async function getEconPoliticalForumPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumPost> {
  const { postId } = props;

  try {
    const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
      where: { id: postId },
      select: {
        id: true,
        thread_id: true,
        author_id: true,
        parent_id: true,
        content: true,
        is_edited: true,
        edited_at: true,
        is_hidden: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

    if (!post) throw new HttpException("Not Found", 404);

    // Public endpoint: do not reveal deleted or hidden posts
    if (post.deleted_at !== null || post.is_hidden === true) {
      throw new HttpException("Not Found", 404);
    }

    return {
      id: post.id as string & tags.Format<"uuid">,
      thread_id: post.thread_id as string & tags.Format<"uuid">,
      author_id: post.author_id as string & tags.Format<"uuid">,
      parent_id:
        post.parent_id === null
          ? undefined
          : (post.parent_id as string & tags.Format<"uuid">),
      content: post.content,
      is_edited: post.is_edited,
      edited_at: post.edited_at ? toISOStringSafe(post.edited_at) : undefined,
      is_hidden: post.is_hidden,
      created_at: toISOStringSafe(post.created_at),
      updated_at: toISOStringSafe(post.updated_at),
      deleted_at: post.deleted_at
        ? toISOStringSafe(post.deleted_at)
        : undefined,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
