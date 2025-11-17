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

export async function getEconomicBoardComments(props: {
  postId: string;
}): Promise<IPageIEconomicBoardComment> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  // Verify post exists and is published
  const post = await MyGlobal.prisma.economic_board_posts.findUnique({
    where: { id: props.postId, status: "published" },
  });

  if (!post) {
    throw new HttpException("Post not found or not published", 404);
  }

  // Retrieve comments with citizen data
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.economic_board_comments.findMany({
      where: {
        post_id: props.postId,
        status: "published",
      },
      include: {
        citizen: true,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.economic_board_comments.count({
      where: {
        post_id: props.postId,
        status: "published",
      },
    }),
  ]);

  // Transform to DTO structure
  const data = comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
    status: comment.status as "published" | "deleted",
    post_id: comment.post_id,
    citizen_id: comment.citizen_id,
    parent_comment_id:
      comment.parent_comment_id !== null
        ? (comment.parent_comment_id satisfies string as string)
        : undefined,
    moderator_deleted_id: comment.moderator_deleted_id
      ? (comment.moderator_deleted_id satisfies string as string)
      : undefined,
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
