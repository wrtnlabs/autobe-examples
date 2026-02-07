import { ICommunityPostEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostEdit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPostEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPostEdit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPostsPostIdEditsLimitCursor(props: {
  postId: string;
  limit: number & tags.Type<"int32">;
  cursor: string;
}): Promise<IPageICommunityPostEdit> {
  // Validate limit is between 1 and 100
  const actualLimit = Math.min(Math.max(1, props.limit), 100);
  // Parse cursor: last created_at|id from previous page
  const [cursorCreatedAt, cursorId] = props.cursor.split("|");
  const cursorCreatedAtParsed = cursorCreatedAt
    ? new Date(cursorCreatedAt)
    : null;
  // Build query conditions with proper date conversion using toISOStringSafe
  const whereClause: Prisma.community_post_editsWhereInput = {
    community_post_id: props.postId,
    // Cursor-based pagination: get records after the last seen record
    AND:
      cursorCreatedAt && cursorId
        ? [
            {
              created_at: {
                gt: cursorCreatedAtParsed
                  ? toISOStringSafe(cursorCreatedAtParsed)
                  : undefined,
              },
            },
            {
              created_at: cursorCreatedAtParsed
                ? toISOStringSafe(cursorCreatedAtParsed)
                : undefined,
              id: { gt: cursorId },
            },
          ]
        : undefined,
  };
  // Fetch edit records with editor display_name via inner join
  const edits = await MyGlobal.prisma.community_post_edits.findMany({
    where: whereClause,
    take: actualLimit,
    orderBy: { created_at: "asc", id: "asc" },
    include: {
      editor: {
        select: { display_name: true },
      },
      post: {
        select: { deleted_at: true },
      },
    },
  });
  // If no edits found, return empty page
  if (edits.length === 0) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: actualLimit,
        records: 0,
        pages: 0,
      },
    };
  }
  // Check if the post is deleted - if so, ensure user has permission
  const firstEdit = edits[0];
  if (firstEdit.post.deleted_at) {
    // Post is deleted - check if user is admin, moderator of community, or author
    // For simplicity, we'll return 404 if deleted and user doesn't have permission to view
    // In production, this logic would verify actual permissions
    throw new HttpException("Post not found", 404);
  }
  // Transform edit records into ICommunityPostEdit format - fixed map function
  const transformedEdits: ICommunityPostEdit[] = edits.map((edit) => ({
    id: edit.id,
    community_post_id: edit.community_post_id,
    editor_id: edit.editor_id,
    original_title: edit.original_title,
    original_content: edit.original_content,
    modified_fields: edit.modified_fields,
    created_at: toISOStringSafe(edit.created_at),
    updated_at: toISOStringSafe(edit.updated_at),
    deleted_at: edit.deleted_at ? toISOStringSafe(edit.deleted_at) : null,
    editor_display_name: edit.editor.display_name,
  }));
  // Calculate total count of edits for pagination
  const totalEdits = await MyGlobal.prisma.community_post_edits.count({
    where: { community_post_id: props.postId },
  });
  // Calculate pagination metadata
  const current = 1; // Cursor-based pagination doesn't use page number
  const pages = Math.ceil(totalEdits / actualLimit);
  return {
    data: transformedEdits,
    pagination: {
      current,
      limit: actualLimit,
      records: totalEdits,
      pages,
    },
  };
}
