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

export async function deleteCommunityPlatformAdminPostsPostIdCommentsCommentId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      community_platform_community_id: true,
    },
  });
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        community_platform_post_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException("Comment not found in post", 404);
  }
  if (comment.deleted_at !== null || comment.status === "removed") {
    throw new HttpException("Comment already deleted", 404);
  }
  throw new HttpException("Forbidden", 403);
}
