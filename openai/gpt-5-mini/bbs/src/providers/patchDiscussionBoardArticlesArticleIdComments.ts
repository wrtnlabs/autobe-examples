import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function patchDiscussionBoardArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const { articleId, body } = props;

  // Verify article existence
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
  });
  if (!article) throw new HttpException("Not Found", 404);

  // Pagination defaults and limits
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = Math.min(
    (body.limit ?? 20) as number &
      tags.Type<"int32"> &
      tags.Minimum<1> as number,
    100,
  );
  const skip = (page - 1) * limit;

  // Sorting
  const orderDirection = body.sort === "createdAt" ? "asc" : "desc";

  // Build and execute queries (inline parameters)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where: {
        discussion_board_article_id: articleId,
        deleted_at: null,
        is_hidden: false, // public listing excludes hidden comments
        ...(body.authorId !== undefined &&
          body.authorId !== null && {
            discussion_board_author_id: body.authorId,
          }),
        ...(body.parentCommentId !== undefined &&
          body.parentCommentId !== null && {
            discussion_board_parent_comment_id: body.parentCommentId,
          }),
        ...(body.search !== undefined &&
          body.search !== null && { content: { contains: body.search } }),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            created_at: true,
          },
        },
      },
      orderBy: { created_at: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: {
        discussion_board_article_id: articleId,
        deleted_at: null,
        is_hidden: false,
        ...(body.authorId !== undefined &&
          body.authorId !== null && {
            discussion_board_author_id: body.authorId,
          }),
        ...(body.parentCommentId !== undefined &&
          body.parentCommentId !== null && {
            discussion_board_parent_comment_id: body.parentCommentId,
          }),
        ...(body.search !== undefined &&
          body.search !== null && { content: { contains: body.search } }),
      },
    }),
  ]);

  // Map to DTO summaries, converting dates safely
  const data = rows.map(
    (r) =>
      ({
        id: r.id as string & tags.Format<"uuid">,
        content: r.content,
        articleId: r.discussion_board_article_id as string &
          tags.Format<"uuid">,
        parentCommentId:
          r.discussion_board_parent_comment_id === null
            ? undefined
            : (r.discussion_board_parent_comment_id as string &
                tags.Format<"uuid">),
        author: r.author
          ? {
              id: r.author.id as string & tags.Format<"uuid">,
              username: r.author.username,
              display_name: r.author.display_name ?? null,
              created_at: toISOStringSafe(r.author.created_at),
            }
          : null,
        createdAt: toISOStringSafe(r.created_at),
        updatedAt: r.updated_at ? toISOStringSafe(r.updated_at) : null,
        isHidden: r.is_hidden,
      }) as IDiscussionBoardComment.ISummary,
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
