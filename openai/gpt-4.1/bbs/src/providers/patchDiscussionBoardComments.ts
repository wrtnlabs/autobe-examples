import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";

export async function patchDiscussionBoardComments(props: {
  body: IDiscussionBoardArticleComment.IRequest;
}): Promise<IPageIDiscussionBoardArticleComment.ISummary> {
  const { body } = props;

  // defaults and pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition
  const where: Record<string, unknown> = {
    ...(body.body && { body: { contains: body.body } }),
    ...(body.discussion_board_article_id && {
      discussion_board_article_id: body.discussion_board_article_id,
    }),
    ...(body.discussion_board_user_id && {
      discussion_board_user_id: body.discussion_board_user_id,
    }),
    ...(body.created_from && { created_at: { gte: body.created_from } }),
    ...(body.created_to && {
      created_at: {
        ...(body.created_from ? { gte: body.created_from } : {}),
        lte: body.created_to,
      },
    }),
    ...(body.updated_from && { updated_at: { gte: body.updated_from } }),
    ...(body.updated_to && {
      updated_at: {
        ...(body.updated_from ? { gte: body.updated_from } : {}),
        lte: body.updated_to,
      },
    }),
    ...(body.deleted === true
      ? { deleted_at: { not: null } }
      : body.deleted === false
        ? { deleted_at: null }
        : {}),
  };

  // Fetch paginated data and total count concurrently
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        user: true,
        article: { include: { user: true } },
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      deleted_at: comment.deleted_at
        ? toISOStringSafe(comment.deleted_at)
        : undefined,
      author: {
        id: comment.user.id,
        email: comment.user.email,
        created_at: toISOStringSafe(comment.user.created_at),
        updated_at: toISOStringSafe(comment.user.updated_at),
        deleted_at: comment.user.deleted_at
          ? toISOStringSafe(comment.user.deleted_at)
          : undefined,
      },
      article: {
        id: comment.article.id,
        title: comment.article.title,
        created_at: toISOStringSafe(comment.article.created_at),
        updated_at: comment.article.updated_at
          ? toISOStringSafe(comment.article.updated_at)
          : undefined,
        user: {
          id: comment.article.user.id,
          email: comment.article.user.email,
          created_at: toISOStringSafe(comment.article.user.created_at),
          updated_at: toISOStringSafe(comment.article.user.updated_at),
          deleted_at: comment.article.user.deleted_at
            ? toISOStringSafe(comment.article.user.deleted_at)
            : undefined,
        },
      },
    })),
  };
}
