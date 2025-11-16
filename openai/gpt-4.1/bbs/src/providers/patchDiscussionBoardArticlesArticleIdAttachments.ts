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
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function patchDiscussionBoardArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.IRequest;
}): Promise<IPageIDiscussionBoardArticleAttachment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;

  // Ensure the article exists (not deleted)
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // WHERE conditions for attachments
  const whereConditions: Record<string, unknown> = {
    article_id: props.articleId,
  };
  if (props.body.file_name) {
    whereConditions.file_name = { contains: props.body.file_name };
  }
  if (props.body.file_type) {
    whereConditions.file_type = props.body.file_type;
  }
  if (props.body.uploaded_date_start || props.body.uploaded_date_end) {
    const uploadedRange: Record<string, string> = {};
    if (props.body.uploaded_date_start) {
      uploadedRange.gte = props.body.uploaded_date_start;
    }
    if (props.body.uploaded_date_end) {
      uploadedRange.lte = props.body.uploaded_date_end;
    }
    whereConditions.uploaded_at = uploadedRange;
  }

  // Sorting
  let orderBy: Record<string, "asc" | "desc"> = { uploaded_at: "desc" };
  if (
    props.body.sort_by &&
    ["uploaded_at", "file_name", "file_type"].includes(props.body.sort_by)
  ) {
    orderBy = {
      [props.body.sort_by]: props.body.sort_order === "asc" ? "asc" : "desc",
    };
  }

  // Fetch attachments and count
  const [attachments, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_attachments.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_article_attachments.count({
      where: whereConditions,
    }),
  ]);

  // Author summary for article
  let authorSummary: IDiscussionBoardArticle.ISummary["author"] | undefined;
  if (article.author_user_id) {
    const user = await MyGlobal.prisma.discussion_board_users.findUnique({
      where: { id: article.author_user_id },
    });
    if (user) {
      authorSummary = {
        id: user.id,
        email: user.email,
        is_email_verified: user.is_email_verified,
        is_active: user.is_active,
        is_blocked: user.is_blocked,
        created_at: toISOStringSafe(user.created_at),
        updated_at: toISOStringSafe(user.updated_at),
        deleted_at:
          user.deleted_at === null
            ? undefined
            : toISOStringSafe(user.deleted_at),
      };
    }
  } else if (article.author_admin_id) {
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: article.author_admin_id },
    });
    if (admin) {
      authorSummary = {
        id: admin.id,
        display_name: admin.email, // Placeholder; ideally use real display_name
      };
    }
  }

  // Article summary structure
  const articleSummary: IDiscussionBoardArticle.ISummary = {
    id: article.id,
    title: article.title,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    author: authorSummary!,
  };

  // Compose attachment summaries
  const data = attachments.map((a) => ({
    id: a.id,
    uri: a.uri,
    file_name: a.file_name,
    file_type: a.file_type,
    file_size: a.file_size,
    uploaded_at: toISOStringSafe(a.uploaded_at),
    article: articleSummary,
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: totalCount,
      pages: limit > 0 ? Math.ceil(totalCount / limit) : 0,
    },
    data,
  };
}
