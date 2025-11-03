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
  const { admin, articleId, body } = props;

  // Only allow if article exists and is not deleted
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: { id: articleId, deleted_at: null },
  });
  if (!article) {
    throw new HttpException("Article not found or has been deleted.", 404);
  }

  // Enforce maximum number of attachments (max 10 per article, only non-deleted)
  const attachmentCount =
    await MyGlobal.prisma.discussion_board_article_attachments.count({
      where: { discussion_board_article_id: articleId, deleted_at: null },
    });
  if (attachmentCount >= 10) {
    throw new HttpException(
      "Attachment limit (10) exceeded for this article.",
      400,
    );
  }

  // Allowed file extensions, kind/mimetype mapping, and size check
  const allowedExtensions: {
    [k: string]: { kind: string; mimetype: string[] };
  } = {
    ".jpg": { kind: "image", mimetype: ["image/jpeg"] },
    ".jpeg": { kind: "image", mimetype: ["image/jpeg"] },
    ".png": { kind: "image", mimetype: ["image/png"] },
    ".gif": { kind: "image", mimetype: ["image/gif"] },
    ".pdf": { kind: "document", mimetype: ["application/pdf"] },
    ".docx": {
      kind: "document",
      mimetype: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    },
    ".xlsx": {
      kind: "document",
      mimetype: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
    },
    ".txt": { kind: "document", mimetype: ["text/plain"] },
    ".zip": { kind: "archive", mimetype: ["application/zip"] },
  };
  const fileName =
    typeof body.filename === "string" ? body.filename.toLowerCase() : "";
  const extensionMatch = /\.[^.]+$/.exec(fileName);
  const extension = extensionMatch ? extensionMatch[0] : "";
  const extensionInfo = allowedExtensions[extension];
  if (
    !extensionInfo ||
    extensionInfo.kind !== body.kind ||
    !extensionInfo.mimetype.includes(body.mimetype)
  ) {
    throw new HttpException("File type, kind, or mimetype not allowed.", 400);
  }
  if (
    typeof body.filesize !== "number" ||
    body.filesize < 1 ||
    body.filesize > 10000000
  ) {
    throw new HttpException(
      "Invalid file size. Allowed size: 1 - 10,000,000 bytes.",
      400,
    );
  }

  // Persist new attachment. deleted_at is null, virus_scanned is true.
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  const created =
    await MyGlobal.prisma.discussion_board_article_attachments.create({
      data: {
        id,
        discussion_board_article_id: articleId,
        filename: body.filename,
        kind: body.kind,
        mimetype: body.mimetype,
        filesize: body.filesize,
        virus_scanned: true,
        created_at: now,
        deleted_at: null,
      },
    });

  // Return API DTO (deleted_at omitted if null)
  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    filename: created.filename,
    kind: created.kind,
    mimetype: created.mimetype,
    filesize: created.filesize,
    virus_scanned: created.virus_scanned,
    created_at: toISOStringSafe(created.created_at),
    ...(created.deleted_at
      ? { deleted_at: toISOStringSafe(created.deleted_at) }
      : {}),
  };
}
