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
  // Step 1: Fetch the article and validate authorization
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: {
      id: true,
      author_user_id: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found or has been deleted.", 404);
  }
  if (article.author_user_id !== props.user.id) {
    throw new HttpException(
      "You are not authorized to upload attachments to this article.",
      403,
    );
  }

  // Step 2: Enforce attachment count limit (e.g., max 10 active attachments per article)
  const currentCount =
    await MyGlobal.prisma.discussion_board_article_attachments.count({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (currentCount >= 10) {
    throw new HttpException(
      "Maximum number of attachments for this article reached.",
      409,
    );
  }

  // Step 3: Validate file extension, kind, mimetype, and size
  const allowedKinds = ["image", "document", "archive"];
  const allowedMimetypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
  ];
  const allowedExtensionsByKind: Record<string, string[]> = {
    image: [".jpg", ".jpeg", ".png", ".gif"],
    document: [".pdf", ".docx", ".xlsx", ".txt"],
    archive: [".zip"],
  };

  if (!allowedKinds.includes(props.body.kind)) {
    throw new HttpException("Invalid attachment kind.", 400);
  }
  const filenameLower = props.body.filename.toLowerCase();
  const expectedExtensions = allowedExtensionsByKind[props.body.kind] || [];
  const hasValidExtension = expectedExtensions.some((ext) =>
    filenameLower.endsWith(ext),
  );
  if (!hasValidExtension) {
    throw new HttpException(
      "File extension does not match allowed types for kind.",
      400,
    );
  }
  if (!allowedMimetypes.includes(props.body.mimetype)) {
    throw new HttpException("Disallowed file mimetype.", 400);
  }
  if (props.body.filesize < 1 || props.body.filesize > 10485760) {
    throw new HttpException("File size must be between 1 byte and 10MB.", 400);
  }

  // Step 4: Insert attachment, set virus_scanned to false (scan result is performed post-upload)
  const id = v4();
  const created_at = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.discussion_board_article_attachments.create({
      data: {
        id: id,
        discussion_board_article_id: props.articleId,
        filename: props.body.filename,
        kind: props.body.kind,
        mimetype: props.body.mimetype,
        filesize: props.body.filesize,
        virus_scanned: false,
        created_at: created_at,
      },
    });
  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    filename: created.filename,
    kind: created.kind,
    mimetype: created.mimetype,
    filesize: created.filesize,
    virus_scanned: created.virus_scanned,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at == null ? null : toISOStringSafe(created.deleted_at),
  };
}
