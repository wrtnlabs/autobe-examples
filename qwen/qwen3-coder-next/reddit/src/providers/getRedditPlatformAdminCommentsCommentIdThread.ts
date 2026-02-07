import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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

export async function getRedditPlatformAdminCommentsCommentIdThread(props: {
  admin: AdminPayload;
  commentId: string;
}): Promise<IRedditPlatformComment> {
  // Validate comment exists (including soft-deleted for thread context)
  const rootComment = await MyGlobal.prisma.reddit_platform_comments.findUnique(
    {
      where: { id: props.commentId },
    },
  );
  if (!rootComment) {
    throw new HttpException("Comment not found", 404);
  }
  // Fetch the complete thread using recursive CTE
  const threadRecords = await MyGlobal.prisma.$queryRaw<
    {
      id: string;
      author_id: string;
      post_id: string;
      parent_comment_id: string | null;
      content: string;
      vote_score: number;
      comment_count: number;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
    }[]
  >`
    WITH RECURSIVE comment_thread AS (
      SELECT 
        c.id,
        c.author_id,
        c.post_id,
        c.parent_comment_id,
        c.content,
        c.vote_score,
        c.comment_count,
        c.created_at::text as created_at,
        c.updated_at::text as updated_at,
        c.deleted_at::text as deleted_at
      FROM reddit_platform_comments c
      WHERE c.id = ${props.commentId}

      UNION ALL

      SELECT 
        c.id,
        c.author_id,
        c.post_id,
        c.parent_comment_id,
        c.content,
        c.vote_score,
        c.comment_count,
        c.created_at::text as created_at,
        c.updated_at::text as updated_at,
        c.deleted_at::text as deleted_at
      FROM reddit_platform_comments c
      INNER JOIN comment_thread ct ON c.parent_comment_id = ct.id
      WHERE c.deleted_at IS NULL
    )
    SELECT * FROM comment_thread 
    WHERE deleted_at IS NULL
    ORDER BY created_at;
  `;
  // Transform flat records into hierarchical structure
  const commentMap = new Map<string, IRedditPlatformComment>();
  // Create comment nodes
  for (const record of threadRecords) {
    commentMap.set(record.id, {
      id: record.id as string & tags.Format<"uuid">,
      author_id: record.author_id as string & tags.Format<"uuid">,
      post_id: record.post_id as string & tags.Format<"uuid">,
      parent_comment_id: record.parent_comment_id
        ? (record.parent_comment_id as string & tags.Format<"uuid">)
        : null,
      content: record.content,
      vote_score: record.vote_score,
      comment_count: record.comment_count,
      created_at: record.created_at as string & tags.Format<"date-time">,
      updated_at: record.updated_at as string & tags.Format<"date-time">,
      deleted_at: record.deleted_at
        ? (record.deleted_at as string & tags.Format<"date-time">)
        : null,
    });
  }
  // Build parent-child relationships
  const rootCommentObj = commentMap.get(props.commentId);
  if (!rootCommentObj) {
    throw new HttpException("Comment not found", 404);
  }
  return rootCommentObj;
}
