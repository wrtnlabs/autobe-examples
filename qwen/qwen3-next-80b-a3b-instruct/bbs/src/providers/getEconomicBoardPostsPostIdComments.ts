import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";

export async function getEconomicBoardPostsPostIdComments(props: {
  postId: string;
}): Promise<IPageIEconomicBoardComment> {
  // Validate post exists and is published
  const post = await MyGlobal.prisma.economic_board_posts.findUnique({
    where: { id: props.postId, status: "published", deleted_at: null },
  });

  if (!post) {
    throw new HttpException("Post not found or not published", 404);
  }

  // Pagination parameters from operation spec: default page=1, limit=20, max=100
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  // Query published comments for this post (not deleted, ordered by newest first)
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.economic_board_comments.findMany({
      where: {
        post_id: props.postId,
        status: "published",
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.economic_board_comments.count({
      where: {
        post_id: props.postId,
        status: "published",
        deleted_at: null,
      },
    }),
  ]);

  // Transform comments to response format with proper date formatting
  const data = comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at === null
        ? undefined
        : toISOStringSafe(comment.deleted_at),
    status: comment.status satisfies string as "published" | "deleted", // Fix: Cast status to literal type
    post_id: comment.post_id,
    citizen_id: comment.citizen_id,
    parent_comment_id:
      comment.parent_comment_id === null
        ? undefined
        : comment.parent_comment_id,
    moderator_deleted_id:
      comment.moderator_deleted_id === null
        ? undefined
        : comment.moderator_deleted_id,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
