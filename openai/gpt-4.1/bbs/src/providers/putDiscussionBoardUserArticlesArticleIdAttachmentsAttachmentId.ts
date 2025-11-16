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

export async function putDiscussionBoardUserArticlesArticleIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.IUpdate;
}): Promise<IDiscussionBoardArticleAttachment> {
  // Check if the article exists and is authored by the current user (regular users only edit their own articles)
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, author_user_id: true },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  if (article.author_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to modify attachments for this article",
      403,
    );
  }
  // Check if the attachment exists and is linked to the target article
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }
  if (attachment.article_id !== props.articleId) {
    throw new HttpException(
      "Attachment does not belong to the specified article",
      400,
    );
  }
  // Only file_name and file_type can be updated (business logic: cannot update uri or article_id)
  if ("uri" in props.body || "article_id" in props.body) {
    throw new HttpException(
      "You cannot update file URI or article/article_id",
      400,
    );
  }
  // Perform update
  const updated =
    await MyGlobal.prisma.discussion_board_article_attachments.update({
      where: { id: props.attachmentId },
      data: {
        file_name:
          props.body.file_name !== undefined
            ? props.body.file_name
            : attachment.file_name,
        file_type:
          props.body.file_type !== undefined
            ? props.body.file_type
            : attachment.file_type,
      },
    });
  return {
    id: updated.id,
    article_id: updated.article_id,
    uri: updated.uri,
    file_name: updated.file_name,
    file_type: updated.file_type,
    file_size: updated.file_size,
    uploaded_at: toISOStringSafe(updated.uploaded_at),
  };
}
