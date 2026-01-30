import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostComment";

export async function patchEconomicForumPostsPostIdCommentsMetrics(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IEconomicForumPostComment.ISummary> {
  // Get the count of comments using correct field names
  const commentStats =
    await MyGlobal.prisma.economic_forum_post_comments.aggregate({
      where: {
        post_id: props.postId,
        deleted_at: null,
      },
      _count: {
        id: true,
      },
    });
  // Find comments to determine reply hierarchy
  const comments = await MyGlobal.prisma.economic_forum_post_comments.findMany({
    where: {
      post_id: props.postId,
      deleted_at: null,
    },
    select: {
      parent_id: true,
      id: true,
    },
  });
  // Calculate maximum reply depth by counting parent chains
  // This requires recursive analysis of the parent_id relationships
  function calculateDepth(
    commentId: string,
    parentId: string | null,
    visited = new Set<string>(),
  ): number {
    if (!parentId || visited.has(parentId)) return 0;
    visited.add(parentId);
    // Find the parent comment
    const parent = comments.find((c) => c.id === parentId);
    if (!parent) return 0;
    return 1 + calculateDepth(parent.id, parent.parent_id, visited);
  }
  const maxReplyDepth =
    comments.length > 0
      ? Math.max(
          ...comments.map((c) =>
            calculateDepth(c.id, c.parent_id || null, new Set()),
          ),
        )
      : 0;
  // Count attachments related to comments under this post
  const attachments =
    await MyGlobal.prisma.economic_forum_post_attachments.findMany({
      where: {
        economic_forum_post_id: props.postId,
      },
      select: {
        id: true,
      },
    });
  const totalComments = commentStats._count?.id || 0;
  const totalAttachments = attachments.length;
  const attachmentsPercentage =
    totalComments > 0 ? (totalAttachments / totalComments) * 100 : 0;
  const averageAttachmentsPerComment =
    totalComments > 0 ? totalAttachments / totalComments : 0;
  // Calculate average content length from body field length
  const commentsWithContent =
    await MyGlobal.prisma.economic_forum_post_comments.findMany({
      where: {
        post_id: props.postId,
        deleted_at: null,
        body: { not: "" }, // Correct way to check non-empty string
      },
      select: {
        body: true,
      },
    });
  const totalContentLength = commentsWithContent.reduce(
    (sum, comment) => sum + (comment.body?.length || 0),
    0,
  );
  const averageContentLength =
    totalComments > 0 ? totalContentLength / totalComments : 0;
  return {
    commentCount: totalComments,
    averageContentLength: averageContentLength,
    maxReplyDepth,
    attachmentsPercentage,
    averageAttachmentsPerComment,
  };
}
