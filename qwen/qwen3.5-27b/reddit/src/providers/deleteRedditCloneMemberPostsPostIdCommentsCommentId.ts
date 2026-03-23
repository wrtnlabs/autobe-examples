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

export async function deleteRedditCloneMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the comment (404 if not found)
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_post_id: true,
        reddit_clone_member_id: true,
        parent_id: true,
        deleted_at: true,
        score: true,
      },
    },
  );
  // Step 2: Verify comment belongs to the specified post
  if (comment.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  // Step 3: Check if comment is already deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment already deleted", 400);
  }
  // Step 4: Fetch post to get community ID for moderator check
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      reddit_clone_community_id: true,
    },
  });
  // Step 5: Check authorization - user is author OR moderator
  const isAuthor = comment.reddit_clone_member_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    const moderator =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          reddit_clone_communities_id: post.reddit_clone_community_id,
          reddit_clone_members_id: props.member.id,
          deleted_at: null,
        },
      });
    isModerator = moderator !== null;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 6: Find all nested replies recursively
  const collectAllDescendants = async (parentId: string): Promise<string[]> => {
    const descendants: string[] = [];
    let directChildren = await MyGlobal.prisma.reddit_clone_comments.findMany({
      where: {
        parent_id: parentId,
        deleted_at: null,
      },
      select: { id: true },
    });
    for (const child of directChildren) {
      descendants.push(child.id);
      const nested = await collectAllDescendants(child.id);
      descendants.push(...nested);
    }
    return descendants;
  };
  const descendantIds = await collectAllDescendants(props.commentId);
  const allIdsToDelete = [props.commentId, ...descendantIds];
  // Step 7: Calculate total karma to subtract from each author
  const allComments = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: {
      id: { in: allIdsToDelete },
    },
    select: {
      reddit_clone_member_id: true,
      score: true,
    },
  });
  // Group by author and calculate karma adjustments
  const karmaAdjustments = new Map<string, number>();
  for (const c of allComments) {
    const current = karmaAdjustments.get(c.reddit_clone_member_id) ?? 0;
    karmaAdjustments.set(c.reddit_clone_member_id, current + c.score);
  }
  // Step 8: Execute soft delete and karma adjustment in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete all comments
    await tx.reddit_clone_comments.updateMany({
      where: { id: { in: allIdsToDelete } },
      data: { deleted_at: new Date() },
    });
    // Adjust karma for each affected author
    for (const [memberId, karmaChange] of karmaAdjustments.entries()) {
      if (karmaChange !== 0) {
        await tx.reddit_clone_members.update({
          where: { id: memberId },
          data: {
            karma: {
              decrement: karmaChange,
            },
            updated_at: new Date(),
          },
        });
      }
    }
  });
}
