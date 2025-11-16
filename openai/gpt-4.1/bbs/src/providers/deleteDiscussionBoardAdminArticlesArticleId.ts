import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  // Step 1: Look up the article and author relations
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    include: {
      authorUser: true,
      authorAdmin: true,
    },
  });

  if (!article) {
    throw new HttpException("Article not found.", 404);
  }

  // Get ISO string for now (for updated_at on comments)
  const now = toISOStringSafe(new Date());

  // Step 2: Hard delete the article (since soft delete unsupported)
  await MyGlobal.prisma.discussion_board_articles.delete({
    where: { id: props.articleId },
  });

  // Step 3: Cascade hard delete for attachments
  await MyGlobal.prisma.discussion_board_article_attachments.deleteMany({
    where: { article_id: props.articleId },
  });

  // Step 4: Cascade soft delete for comments (if supported)
  await MyGlobal.prisma.discussion_board_comments.updateMany({
    where: { discussion_board_article_id: props.articleId },
    data: { updated_at: now },
  });

  // Step 5: Compose author summary
  let author_user: IDiscussionBoardUser.ISummary | null | undefined = undefined;
  let author_admin: IDiscussionBoardAdmin.ISummary | null | undefined =
    undefined;
  if (article.author_user_id && article.authorUser) {
    author_user = {
      id: article.authorUser.id,
      email: article.authorUser.email,
      is_email_verified: article.authorUser.is_email_verified,
      is_active: article.authorUser.is_active,
      is_blocked: article.authorUser.is_blocked,
      created_at: toISOStringSafe(article.authorUser.created_at),
      updated_at: toISOStringSafe(article.authorUser.updated_at),
      deleted_at: undefined, // Set as undefined since schema doesn't return deleted_at
    };
  }
  if (article.author_admin_id && article.authorAdmin) {
    author_admin = {
      id: article.authorAdmin.id,
      display_name: article.authorAdmin.email,
    };
  }

  // Step 6: Return result DTO based on deleted article values
  return {
    id: article.id,
    title: article.title,
    body: article.body,
    author_user,
    author_admin,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
  };
}
