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

export async function deleteCommunityPlatformAdminCommentsCommentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, user_id: true, post_id: true },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: comment.post_id },
    select: { community_id: true },
  });
  if (!post) throw new HttpException("Post not found", 404);
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: post.community_id,
        community_moderator_id: props.admin.id,
        deleted_at: null,
      },
    });
  if (!moderatorRecord) throw new HttpException("Forbidden", 403);
  await MyGlobal.prisma.community_platform_comments.delete({
    where: { id: props.commentId },
  });
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      moderator_id: props.admin.id,
      action_type: "delete_comment",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
