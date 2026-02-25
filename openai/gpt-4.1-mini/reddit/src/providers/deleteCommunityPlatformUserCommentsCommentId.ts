import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the comment with author and post IDs
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, user_id: true, post_id: true },
    });
  // Check ownership
  const isOwner = comment.user_id === props.user.id;
  if (!isOwner) {
    // If not owner, check moderator role in community
    const post =
      await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
        where: { id: comment.post_id },
        select: { community_id: true },
      });
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: post.community_id,
          community_moderator_id: props.user.id,
          role: { in: ["owner", "moderator"] },
          deleted_at: null,
        },
      });
    if (!moderator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Transaction for deletion
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_comments.delete({
      where: { id: props.commentId },
    });
  });
  return;
}
