import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteDiscussionBoardUserArticlesArticleIdAttachmentsAttachmentId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Check attachment exists and retrieve
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (!attachment) throw new HttpException("Attachment not found", 404);

  // 2. Verify the attachment is for the correct article
  if (attachment.article_id !== props.articleId)
    throw new HttpException(
      "Attachment does not belong to the specified article",
      404,
    );

  // 3. Retrieve the article
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) throw new HttpException("Article not found", 404);

  // 4. Permission check: Only article author can delete
  if (article.author_user_id !== props.user.id)
    throw new HttpException(
      "Forbidden: Only the article author may delete attachments",
      403,
    );

  // 5. Remove from DB atomically
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_article_attachments.delete({
      where: { id: props.attachmentId },
    }),
  ]);
  // File removal from backend storage omitted because MyGlobal has no storage property.
}
