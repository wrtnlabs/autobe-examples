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

export async function deleteRedditCloneMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the comment - throws 404 if not found
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_post_id: true,
        parent_id: true,
        score: true,
        deleted_at: true,
        post: {
          select: {
            reddit_clone_community_id: true,
          },
        },
      },
    },
  );
  // Check if already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is already deleted", 409);
  }
  // Authorization check: must be author or moderator
  const isAuthor = comment.reddit_clone_member_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    const moderator =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_members_id: props.member.id,
          reddit_clone_communities_id: comment.post.reddit_clone_community_id,
          deleted_at: null,
        },
      });
    isModerator = moderator !== null;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Get all descendant comment IDs using iterative BFS approach
  const getAllDescendantIds = async (parentId: string): Promise<string[]> => {
    const allDescendants: string[] = [];
    const queue: string[] = [parentId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await MyGlobal.prisma.reddit_clone_comments.findMany({
        where: {
          parent_id: currentId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      for (const child of children) {
        allDescendants.push(child.id);
        queue.push(child.id);
      }
    }
    return allDescendants;
  };
  const descendantIds = await getAllDescendantIds(comment.id);
  const allCommentIds = [comment.id, ...descendantIds];
  // Get all comments to delete with their scores and authors
  const commentsToDelete = await MyGlobal.prisma.reddit_clone_comments.findMany(
    {
      where: {
        id: { in: allCommentIds },
      },
      select: {
        id: true,
        reddit_clone_member_id: true,
        score: true,
      },
    },
  );
  // Calculate karma adjustments per member
  const karmaAdjustments = new Map<string, number>();
  for (const c of commentsToDelete) {
    const current = karmaAdjustments.get(c.reddit_clone_member_id) || 0;
    karmaAdjustments.set(c.reddit_clone_member_id, current - c.score);
  }
  // Perform the deletion in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete all comments
    await tx.reddit_clone_comments.updateMany({
      where: {
        id: { in: allCommentIds },
      },
      data: {
        deleted_at: new Date(),
      },
    });
    // Adjust karma scores for each affected member
    for (const [memberId, adjustment] of karmaAdjustments.entries()) {
      if (adjustment !== 0) {
        await tx.reddit_clone_members.update({
          where: { id: memberId },
          data: {
            karma: {
              increment: adjustment < 0 ? -adjustment : adjustment,
            },
          },
        });
      }
    }
  });
}
