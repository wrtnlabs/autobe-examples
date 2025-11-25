import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Step 1: Ensure article exists and is not soft-deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found or deleted", 404);
  }

  // Step 2: Ownership check (user must be author, system currently supports user only)
  if (article.user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to attach files to this article.",
      403,
    );
  }

  // Step 3: Count current active attachments for the article
  const numActiveAttachments =
    await MyGlobal.prisma.discussion_board_article_attachments.count({
      where: {
        article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (numActiveAttachments >= 5) {
    throw new HttpException(
      "Maximum of 5 attachments per article exceeded.",
      400,
    );
  }

  // Step 4: Validate file extension and mime (business-only validation, type system checks enforced upstream)
  const allowedExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
  ];
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];

  // File extension, case-insensitive
  const fileName = props.body.file_name;
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";
  if (!allowedExtensions.includes(ext)) {
    throw new HttpException("Unsupported file extension", 400);
  }
  if (!allowedMimes.includes(props.body.mime_type)) {
    throw new HttpException("Unsupported MIME type", 400);
  }

  // Step 5: Attach!
  const nowStr = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.discussion_board_article_attachments.create({
      data: {
        id: v4(),
        article_id: props.articleId,
        file_name: props.body.file_name,
        mime_type: props.body.mime_type,
        file_size: props.body.file_size,
        file_uri: props.body.file_uri,
        created_at: nowStr,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    article_id: created.article_id,
    file_name: created.file_name,
    mime_type: created.mime_type,
    file_size: created.file_size,
    file_uri: created.file_uri,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
