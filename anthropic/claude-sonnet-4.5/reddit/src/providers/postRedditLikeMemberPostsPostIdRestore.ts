import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeMemberPostsPostIdRestore(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePost> {
  const { member, postId } = props;

  const post = await MyGlobal.prisma.reddit_like_posts.findFirst({
    where: {
      id: postId,
      deleted_at: { not: null },
    },
  });

  if (!post) {
    throw new HttpException("Post not found or not in deleted state", 404);
  }

  if (post.reddit_like_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only restore your own posts",
      403,
    );
  }

  const restored = await MyGlobal.prisma.reddit_like_posts.update({
    where: { id: postId },
    data: {
      deleted_at: null,
      updated_at: new Date(),
    },
  });

  return {
    id: restored.id as string & tags.Format<"uuid">,
    type: restored.type,
    title: restored.title,
    created_at: toISOStringSafe(restored.created_at),
    updated_at: toISOStringSafe(restored.updated_at),
  };
}
