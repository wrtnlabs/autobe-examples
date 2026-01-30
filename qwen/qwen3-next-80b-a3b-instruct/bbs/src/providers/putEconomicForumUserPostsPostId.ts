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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putEconomicForumUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconomicForumPost.IUpdate;
}): Promise<IEconomicForumPost> {
  // Verify post exists
  const post = await MyGlobal.prisma.economic_forum_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Check authorization: user must be admin or owner of the post
  if (props.user.type === "user") {
    // For regular users, verify they own this post
    if (post.economic_forum_user_id !== props.user.id) {
      throw new HttpException(
        "Forbidden - You can only update your own posts",
        403,
      );
    }
  }
  // Update the post with only allowed fields
  const updated = await MyGlobal.prisma.economic_forum_posts.update({
    where: { id: props.postId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    economic_forum_user_id: updated.economic_forum_user_id,
    economic_forum_admin_id: updated.economic_forum_admin_id,
    updated_at: updated.updated_at,
  };
}
