import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getDiscussionBoardUserArticlesArticleIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleAttachment> {
  const { user, articleId, attachmentId } = props;

  // Get the attachment for this article that is not soft-deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findFirst({
      where: {
        id: attachmentId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }
  // Ensure the article exists and is not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      deleted_at: null,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Only article author can access (user context)
  if (article.author_user_id !== user.id) {
    throw new HttpException(
      "Forbidden: you are not the author of this article",
      403,
    );
  }
  return {
    id: attachment.id,
    discussion_board_article_id: attachment.discussion_board_article_id,
    filename: attachment.filename,
    kind: attachment.kind,
    mimetype: attachment.mimetype,
    filesize: attachment.filesize,
    virus_scanned: attachment.virus_scanned,
    created_at: toISOStringSafe(attachment.created_at),
    deleted_at: undefined,
  };
}
