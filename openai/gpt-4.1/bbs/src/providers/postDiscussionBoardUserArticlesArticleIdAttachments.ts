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

export async function postDiscussionBoardUserArticlesArticleIdAttachments(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.ICreate;
}): Promise<IDiscussionBoardArticleAttachment> {
  // 1. Fetch the article
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // 2. Check permission (must be author)
  if (article.author_user_id !== props.user.id) {
    throw new HttpException(
      "You are not authorized to upload attachments to this article",
      403,
    );
  }

  // 3. Count current attachments for the article
  const attachmentCount =
    await MyGlobal.prisma.discussion_board_article_attachments.count({
      where: { article_id: props.articleId },
    });
  if (attachmentCount >= 10) {
    throw new HttpException("Attachment limit reached (10 per article)", 400);
  }

  // 4. Enforce file type
  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowedTypes.includes(props.body.file_type)) {
    throw new HttpException("Invalid file type", 400);
  }

  // 5. Enforce file size ≤ 10MB
  if (props.body.file_size > 10485760) {
    throw new HttpException("Attachment exceeds 10MB limit", 400);
  }

  // 6. Insert new attachment
  const now = toISOStringSafe(new Date());
  const newId = v4();
  const created =
    await MyGlobal.prisma.discussion_board_article_attachments.create({
      data: {
        id: newId,
        article_id: props.articleId,
        uri: props.body.uri,
        file_name: props.body.file_name,
        file_type: props.body.file_type,
        file_size: props.body.file_size,
        uploaded_at: now,
      },
    });

  return {
    id: created.id,
    article_id: created.article_id,
    uri: created.uri,
    file_name: created.file_name,
    file_type: created.file_type,
    file_size: created.file_size,
    uploaded_at: toISOStringSafe(created.uploaded_at),
  };
}
