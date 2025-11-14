import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumComment";
import { IPageIPoliticalForumComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalForumComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchPoliticalForumPostsPostIdComments(props: {
  postId: string;
  body: IPoliticalForumComment.IRequest;
}): Promise<IPageIPoliticalForumComment.ISummary> {
  // Verify the post exists and is not deleted
  const post = await MyGlobal.prisma.political_forum_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, deleted_at: true },
  });

  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }

  // The IRequest type is string, so treat body as keyword
  const keyword = props.body;

  // Pagination parameters from system defaults (1-based page, limit up to 20)
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build where condition
  const whereCondition = {
    post_id: props.postId,
    deleted_at: null,
    ...(keyword &&
      keyword.trim().length > 0 && { body: { contains: keyword } }),
  };

  // Execute concurrent queries with inline parameters
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.political_forum_comments.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        post_id: true,
        citizen_id: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.political_forum_comments.count({ where: whereCondition }),
  ]);

  // Transform results to match ISummary interface - use toISOStringSafe for dates
  const commentSummaries = comments.map((comment) => comment.body);

  // Return paginated response
  return {
    pagination: {
      page: Number(page),
      pageSize: Number(limit),
      total: Number(total),
      totalPages: Math.ceil(total / limit),
    },
    data: commentSummaries,
  };
}
