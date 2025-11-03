import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchDiscussionBoardUserArticlesArticleIdAttachments(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.IRequest;
}): Promise<IPageIDiscussionBoardArticleAttachment.ISummary> {
  const { user, articleId, body } = props;

  // 1. Authorization: Only the article author can view (not other users)
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
      select: { author_user_id: true },
    });
  if (article.author_user_id !== user.id) {
    throw new HttpException("Only article author may list attachments", 403);
  }

  // 2. Filtering conditions
  const where = {
    discussion_board_article_id: articleId,
    deleted_at: null,
    ...(body.kind ? { kind: body.kind } : {}),
    ...(body.filename ? { filename: { contains: body.filename } } : {}),
    ...(body.filesizeMin !== undefined
      ? { filesize: { gte: body.filesizeMin } }
      : {}),
    ...(body.filesizeMax !== undefined
      ? {
          filesize: {
            ...(body.filesizeMin !== undefined
              ? { gte: body.filesizeMin }
              : {}),
            lte: body.filesizeMax,
          },
        }
      : {}),
    // created_at: range filtering
    ...(body.createdFrom || body.createdTo
      ? {
          created_at: {
            ...(body.createdFrom ? { gte: body.createdFrom } : {}),
            ...(body.createdTo ? { lte: body.createdTo } : {}),
          },
        }
      : {}),
  };

  // 3. Sorting
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (
    body.sortBy === "filename" ||
    body.sortBy === "filesize" ||
    body.sortBy === "created_at"
  ) {
    orderBy = {};
    orderBy[body.sortBy] = body.sortOrder === "asc" ? "asc" : "desc";
  }

  // 4. Pagination parameters
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.pageSize && body.pageSize > 0 ? body.pageSize : 20;
  const skip = (page - 1) * limit;

  // 5. Fetch attachments and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_attachments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        filename: true,
        kind: true,
        mimetype: true,
      },
    }),
    MyGlobal.prisma.discussion_board_article_attachments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      kind: row.kind,
      mimetype: row.mimetype,
    })),
  };
}
