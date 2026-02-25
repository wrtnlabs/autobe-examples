import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  // Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 50, 100); // Max 100 per system constraints
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereClause: Prisma.discussion_board_commentsWhereInput = {
    article: { id: props.articleId },
    deleted_at: null,
    ...(props.body.search && {
      content: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.author_display_name && {
      author: { display_name: { equals: props.body.author_display_name } },
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
    ...(props.body.updated_at_start && {
      updated_at: { gte: props.body.updated_at_start },
    }),
    ...(props.body.updated_at_end && {
      updated_at: { lte: props.body.updated_at_end },
    }),
  };
  // Query data sequentially
  const data = await MyGlobal.prisma.discussion_board_comments.findMany({
    where: whereClause,
    include: {
      author: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
        },
      },
    } satisfies Prisma.discussion_board_commentsInclude,
    orderBy: { created_at: "asc" },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.discussion_board_comments.count({
    where: whereClause,
  });
  // Transform data to response format
  const transformedData = data.map(
    (comment) =>
      ({
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author.id,
          display_name: comment.author.display_name,
          bio: comment.author.bio === null ? undefined : comment.author.bio,
          created_at: toISOStringSafe(comment.author.created_at),
        } satisfies IDiscussionBoardUser.ISummary,
        created_at: toISOStringSafe(comment.created_at),
        updated_at: toISOStringSafe(comment.updated_at),
      }) satisfies IDiscussionBoardComment.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardComment.ISummary;
}
