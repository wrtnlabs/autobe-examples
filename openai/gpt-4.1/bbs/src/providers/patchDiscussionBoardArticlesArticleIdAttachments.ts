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
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function patchDiscussionBoardArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.IRequest;
}): Promise<IPageIDiscussionBoardArticleAttachment.ISummary> {
  const page = props.body.page ?? 1;
  const cappedLimit =
    props.body.limit !== undefined
      ? Math.max(1, Math.min(50, props.body.limit))
      : 20;
  const skip = (page - 1) * cappedLimit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  // Verify the parent article exists, is not soft-deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    include: {
      user: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found or deleted.", 404);
  }

  // Build where clause for attachments filtering
  const whereClause: Record<string, any> = {
    article_id: props.articleId,
    deleted_at: null,
    ...(props.body.search
      ? { file_name: { contains: props.body.search, mode: "insensitive" } }
      : {}),
  };

  // Attachments fetch with sorting and pagination
  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_attachments.findMany({
      where: whereClause,
      skip,
      take: cappedLimit,
      orderBy: { [sortBy]: order },
    }),
    MyGlobal.prisma.discussion_board_article_attachments.count({
      where: whereClause,
    }),
  ]);

  // Article user summary
  const userSummary = {
    id: article.user.id,
    email: article.user.email,
    created_at: toISOStringSafe(article.user.created_at),
    updated_at: toISOStringSafe(article.user.updated_at),
    deleted_at: article.user.deleted_at
      ? toISOStringSafe(article.user.deleted_at)
      : undefined,
  };
  // Article summary
  const articleSummary = {
    id: article.id,
    title: article.title,
    user: userSummary,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
  };

  // Attachments summary map
  const records = attachments.map((att) => ({
    id: att.id,
    article: articleSummary,
    file_name: att.file_name,
    mime_type: att.mime_type,
    file_size: att.file_size,
    file_uri: att.file_uri,
    created_at: toISOStringSafe(att.created_at),
    deleted_at: att.deleted_at ? toISOStringSafe(att.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: cappedLimit,
      records: total,
      pages: Math.ceil(total / cappedLimit),
    },
    data: records,
  };
}
