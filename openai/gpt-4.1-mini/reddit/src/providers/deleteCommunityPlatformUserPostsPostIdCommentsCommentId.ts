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

export async function deleteCommunityPlatformUserPostsPostIdCommentsCommentId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.community_platform_post_comments.findUnique({
      where: { id: props.commentId },
      select: {
        id: true,
        post_id: true,
        user_id: true,
      },
    });
  if (!comment || comment.post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      community_id: true,
    },
  });
  if (!post) {
    throw new HttpException("Comment not found", 404);
  }
  const isAuthor = comment.user_id === props.user.id;
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: post.community_id,
        user_id: props.user.id,
        delete_permission: true,
      },
      select: {
        id: true,
      },
    });
  const isModerator = moderator !== null;
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_post_comments.delete({
    where: { id: props.commentId },
  });
  if (!isAuthor && isModerator) {
    await MyGlobal.prisma.community_platform_moderation_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        comment_id: props.commentId,
        post_id: props.postId,
        action_type: "delete",
        moderator_id: props.user.id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
}
