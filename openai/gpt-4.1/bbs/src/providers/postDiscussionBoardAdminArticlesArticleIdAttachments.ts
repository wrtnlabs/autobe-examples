import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postDiscussionBoardAdminArticlesArticleIdAttachments(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.ICreate;
}): Promise<IDiscussionBoardArticleAttachment> {
  // 1. Lookup target article (not deleted)
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
    select: { id: true, user_id: true },
  });
  if (!article) {
    throw new HttpException("Article not found or deleted.", 404);
  }

  // 2. Permission check: admin can always attach; otherwise must be owner
  if (!(props.admin.type === "admin" || props.admin.id === article.user_id)) {
    throw new HttpException(
      "Forbidden: only the article owner or admin can upload attachments.",
      403,
    );
  }

  // 3. Check attachment quota: max 5 per article
  const attachmentCount =
    await MyGlobal.prisma.discussion_board_article_attachments.count({
      where: { article_id: props.articleId, deleted_at: null },
    });
  if (attachmentCount >= 5) {
    throw new HttpException(
      "Attachment limit reached (max 5 per article).",
      400,
    );
  }

  // 4. Create attachment entry
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.discussion_board_article_attachments.create({
      data: {
        id: v4(),
        article_id: props.articleId,
        file_name: props.body.file_name,
        mime_type: props.body.mime_type,
        file_size: props.body.file_size,
        file_uri: props.body.file_uri,
        created_at: now,
        deleted_at: null,
      },
    });

  // 5. Return DTO
  return {
    id: created.id,
    article_id: created.article_id,
    file_name: created.file_name,
    mime_type: created.mime_type,
    file_size: created.file_size,
    file_uri: created.file_uri,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
