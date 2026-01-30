import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import { AdminPayload } from "../decorators/payload/AdminPayload";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteEconomicForumAdminPostsPostId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IEconomicForumPost> {
  // Verify the post exists and is not already deleted (though hard delete, still good practice)
  const post = await MyGlobal.prisma.economic_forum_posts.findUnique({
    where: { id: props.postId, deleted_at: null },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Log the deletion in audit table
  await MyGlobal.prisma.economic_forum_system_audits.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      action: "DELETE_POST",
      post_id: props.postId, // Fixed field name to match schema convention: post_id instead of posts_id
      details: JSON.stringify({}),
      occurred_at: toISOStringSafe(new Date()),
    },
  });
  // Delete the post
  await MyGlobal.prisma.economic_forum_posts.delete({
    where: { id: props.postId },
  });
  // Return the deleted post with proper date conversion
  return {
    id: post.id,
    title: post.title,
    content: post.body,
    author_id: post.economic_forum_user_id,
    status: post.status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
  };
}
