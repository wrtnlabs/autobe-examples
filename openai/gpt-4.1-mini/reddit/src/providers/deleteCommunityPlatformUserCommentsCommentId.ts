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
  // Step 1: Retrieve the comment with author and post id
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      user_id: true,
      post_id: true,
      parent_id: true,
      content: true,
      is_deleted: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Step 1.5: Retrieve the post
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: comment.post_id },
    select: {
      id: true,
      community_id: true,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Step 1.75: Retrieve the community moderators
  const moderatorsRaw =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: { community_id: post.community_id },
      select: { community_moderator_id: true },
    });
  const moderators = moderatorsRaw.map((m) => m.community_moderator_id);
  // Step 2: Authorization check
  const isAuthor = comment.user_id === props.user.id;
  const isModerator = moderators.includes(props.user.id);
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Recursive delete in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    async function deleteCommentRecursively(
      id: string & tags.Format<"uuid">,
    ): Promise<void> {
      const childComments = await tx.community_platform_comments.findMany({
        where: { parent_id: id },
        select: { id: true },
      });
      for (const child of childComments) {
        await deleteCommentRecursively(child.id);
      }
      await tx.community_platform_comments.delete({ where: { id } });
    }
    await deleteCommentRecursively(props.commentId);
  });
  // Step 4: Log deletion
  await MyGlobal.prisma.community_platform_activity_logs.create({
    data: {
      id: v4(),
      user_id: props.user.id,
      action_type: "delete_comment",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
