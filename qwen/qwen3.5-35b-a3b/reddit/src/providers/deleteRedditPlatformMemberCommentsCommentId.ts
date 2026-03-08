import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment = await MyGlobal.prisma.reddit_platform_comments.findFirst({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
    include: {
      post: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  const isAuthor: boolean = comment.author_id === props.member.id;
  const isModerator: boolean =
    comment.post !== null
      ? (await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
          where: {
            community_id: comment.post.reddit_platform_community_id,
            user_id: props.member.id,
          },
        })) !== null
      : false;
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const deletionTimestamp: string & tags.Format<"date-time"> =
    new Date().toISOString();
  await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: props.commentId },
    data: { deleted_at: deletionTimestamp },
  });
  const deleteNestedReplies = async (
    parentId: string & tags.Format<"uuid">,
  ): Promise<string[] & readonly string[]> => {
    const replies = await MyGlobal.prisma.reddit_platform_comments.findMany({
      where: { parent_id: parentId, deleted_at: null },
      select: { id: true },
    });
    if (replies.length > 0) {
      await MyGlobal.prisma.reddit_platform_comments.updateMany({
        where: {
          id: { in: replies.map((r) => r.id) },
        },
        data: { deleted_at: deletionTimestamp },
      });
      const allNestedIds: string[] & readonly string[] = [
        ...replies.map((r) => r.id),
      ];
      for (const reply of replies) {
        const childIds = await deleteNestedReplies(reply.id);
        allNestedIds.push(...childIds);
      }
      return allNestedIds;
    }
    return [];
  };
  await deleteNestedReplies(props.commentId);
  if (comment.post_id !== null) {
    await MyGlobal.prisma.reddit_platform_posts.update({
      where: { id: comment.post_id },
      data: {
        comment_count: { decrement: 1 },
      },
    });
  }
  if (comment.parent_id !== null) {
    await MyGlobal.prisma.reddit_platform_comments.update({
      where: { id: comment.parent_id },
      data: { updated_at: deletionTimestamp },
    });
  }
}
