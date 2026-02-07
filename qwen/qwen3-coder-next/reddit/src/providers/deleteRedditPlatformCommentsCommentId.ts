import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the comment to delete with author info
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      author_id: true,
      post_id: true,
      parent_comment_id: true,
    },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  // Check authorization - comment author can delete their own comment
  // In a real implementation, you would check for moderator/admin roles
  // For now, we'll assume authorization is handled by the route middleware
  // or that this endpoint is only accessible to authorized users
  // Recursively delete the comment and all its descendants
  // This requires a recursive CTE or multiple queries to handle the tree structure
  // First, get all descendant comment IDs using a recursive query
  const descendantIds = await getDescendantCommentIds(comment.id);
  // Delete all descendant comments
  if (descendantIds.length > 0) {
    await MyGlobal.prisma.reddit_platform_comments.deleteMany({
      where: { id: { in: descendantIds } },
    });
  }
  // Delete the parent comment
  await MyGlobal.prisma.reddit_platform_comments.delete({
    where: { id: comment.id },
  });
  // Helper function to get all descendant comment IDs recursively
  async function getDescendantCommentIds(parentId: string): Promise<string[]> {
    const descendants: string[] = [];
    let currentLevel = [parentId];
    while (currentLevel.length > 0) {
      const nextLevel: string[] = [];
      for (const parentId of currentLevel) {
        const children =
          await MyGlobal.prisma.reddit_platform_comments.findMany({
            where: { parent_comment_id: parentId },
            select: { id: true },
          });
        for (const child of children) {
          descendants.push(child.id);
          nextLevel.push(child.id);
        }
      }
      currentLevel = nextLevel;
    }
    return descendants;
  }
}
