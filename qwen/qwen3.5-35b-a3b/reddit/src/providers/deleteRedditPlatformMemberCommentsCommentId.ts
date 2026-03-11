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
  const comment =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      include: {
        author: { select: { id: true } },
        post: {
          select: {
            id: true,
            community: { select: { id: true } },
          },
        },
      },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 404);
  }
  const isAuthor = comment.author.id === props.member.id;
  if (!isAuthor) {
    if (comment.post === null) {
      throw new HttpException("Comment has no associated post", 404);
    }
    const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
      where: { id: comment.post.id },
      include: { community: { select: { id: true } } },
    });
    if (post.deleted_at !== null) {
      throw new HttpException("Post has been deleted", 409);
    }
    const moderator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          community_id: post.community.id,
          user_id: props.member.id,
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const upvoteCount =
    await MyGlobal.prisma.reddit_platform_comment_votes.aggregate({
      where: {
        comment_id: props.commentId,
        vote_type: "UPVOTE",
        deleted_at: null,
      },
      _count: { id: true },
    });
  const nestedReplyIds = await findNestedReplies(props.commentId);
  const cascadeCount = nestedReplyIds.length + 1;
  await MyGlobal.prisma.$transaction(async (tx) => {
    const deleteCommentIds: string[] = [props.commentId, ...nestedReplyIds];
    await tx.reddit_platform_comment_votes.deleteMany({
      where: {
        comment_id: {
          in: deleteCommentIds,
        },
        deleted_at: null,
      },
    });
    await tx.reddit_platform_comments.deleteMany({
      where: {
        id: {
          in: deleteCommentIds,
        },
      },
    });
    const deletedComment = await tx.reddit_platform_comments.findUnique({
      where: { id: props.commentId },
      include: { author: true, post: true },
    });
    if (deletedComment !== null && deletedComment.post_id !== null) {
      await tx.reddit_platform_posts.update({
        where: { id: deletedComment.post_id },
        data: {
          comment_count: {
            decrement: 1,
          },
        },
      });
    }
    if (deletedComment !== null && deletedComment.parent_id !== null) {
      const parentComment = await tx.reddit_platform_comments.findFirst({
        where: { id: deletedComment.parent_id },
        include: { replies: { where: { deleted_at: null } } },
      });
      if (parentComment !== null) {
        await tx.reddit_platform_comments.update({
          where: { id: parentComment.id },
          data: {},
        });
      }
    }
    if (deletedComment !== null && deletedComment.author_id !== null) {
      await tx.reddit_platform_members.update({
        where: { id: deletedComment.author_id },
        data: {
          karma_score: {
            decrement: upvoteCount._count.id,
          },
        },
      });
    }
  });
  if (isAuthor === false && comment.post !== null) {
    const auditTimestamp: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(),
    );
    await MyGlobal.prisma.reddit_platform_moderation_audit_logs.create({
      data: {
        id: v4(),
        moderator_id: props.member.id,
        community_id: comment.post.community.id,
        action_target_comment_id: props.commentId,
        action_type: "delete_comment",
        action_target_type: "comment",
        action_details: JSON.stringify({ cascade_count: cascadeCount }),
        created_at: auditTimestamp,
        updated_at: auditTimestamp,
      },
    });
  }
}
async function findNestedReplies(
  commentId: string & tags.Format<"uuid">,
): Promise<string[]> {
  const allReplies: string[] = [];
  const queue: string[] = [commentId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const replies = await MyGlobal.prisma.reddit_platform_comments.findMany({
      where: {
        parent_id: currentId,
        deleted_at: null,
      },
      select: { id: true },
    });
    for (const reply of replies) {
      allReplies.push(reply.id);
      queue.push(reply.id);
    }
  }
  return allReplies;
}
