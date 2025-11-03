import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchDiscussionBoardUserArticlesArticleIdComments(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleComment.IRequest;
}): Promise<IPageIDiscussionBoardArticleComment.ISummary> {
  const { articleId, body } = props;

  // Build WHERE clause
  const where = {
    discussion_board_article_id: articleId,
    deleted_at: null,
    ...(body.author_user_id !== undefined &&
      body.author_user_id !== null && {
        author_user_id: body.author_user_id,
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        body: { contains: body.search },
      }),
  };

  // Determine sort order inline
  const orderBy =
    body.sort === "created_at-asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };

  // Pagination
  const skip = (Number(body.page) - 1) * Number(body.limit);
  const take = Number(body.limit);

  // Fetch total and rows
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_comments.count({ where }),
    MyGlobal.prisma.discussion_board_article_comments.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
  ]);

  // Batch load all unique author_user_ids
  const authorUserIds = Array.from(
    new Set(rows.map((row) => row.author_user_id)),
  );
  const authors = authorUserIds.length
    ? await MyGlobal.prisma.discussion_board_users.findMany({
        where: { id: { in: authorUserIds } },
      })
    : [];
  const authorMap = new Map(authors.map((user) => [user.id, user]));

  // Map rows to API ISummary
  const data = rows.map((row) => {
    const author = authorMap.get(row.author_user_id);
    return {
      id: row.id,
      discussion_board_article_id: row.discussion_board_article_id,
      author: author
        ? {
            id: author.id,
            display_name: author.display_name,
            avatar_url:
              author.avatar_url === null
                ? null
                : (author.avatar_url ?? undefined),
          }
        : {
            id: row.author_user_id,
            display_name: "[deleted user]",
          },
      body: row.body,
      created_at: toISOStringSafe(row.created_at),
      updated_at: row.updated_at ? toISOStringSafe(row.updated_at) : undefined,
      deleted_at:
        row.deleted_at === null ? undefined : toISOStringSafe(row.deleted_at),
    };
  });

  return {
    pagination: {
      current: Number(body.page),
      limit: Number(body.limit),
      records: total,
      pages: Math.ceil(total / Number(body.limit)),
    },
    data,
  };
}
