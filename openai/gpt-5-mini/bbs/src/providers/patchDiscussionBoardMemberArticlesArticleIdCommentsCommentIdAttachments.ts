import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberArticlesArticleIdCommentsCommentIdAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentAttachment.IRequest;
}): Promise<IPageIDiscussionBoardCommentAttachment.ISummary> {
  const { member, articleId, commentId, body } = props;

  // Verify article exists
  try {
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
    });
  } catch {
    throw new HttpException("Not Found: article does not exist", 404);
  }

  // Verify comment exists and belongs to article
  let comment;
  try {
    comment = await MyGlobal.prisma.discussion_board_comments.findFirstOrThrow({
      where: { id: commentId, discussion_board_article_id: articleId },
    });
  } catch {
    throw new HttpException(
      "Not Found: comment does not belong to the specified article",
      404,
    );
  }

  // Authorization: the authenticated member must be the comment author
  if (comment.discussion_board_author_id !== member.id) {
    throw new HttpException(
      "Forbidden: you are not the author of this comment",
      403,
    );
  }

  // Enforce per-comment quota (MVP: max 1 attachment)
  const existingCount =
    await MyGlobal.prisma.discussion_board_comment_attachments.count({
      where: { discussion_board_comment_id: commentId },
    });
  const incomingCount = Array.isArray(body.attachments)
    ? body.attachments.length
    : 0;
  const MAX_PER_COMMENT = 1;
  if (existingCount + incomingCount > MAX_PER_COMMENT) {
    throw new HttpException(
      "Bad Request: attachment quota exceeded for this comment",
      400,
    );
  }

  // Validation
  const MAX_SIZE = 26214400; // 25 MB
  const ALLOWED_MIME = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
  ]);

  if (!Array.isArray(body.attachments) || body.attachments.length === 0) {
    throw new HttpException(
      "Bad Request: attachments array is required and must contain at least one item",
      400,
    );
  }

  // Prepare timestamp once
  const now = toISOStringSafe(new Date());

  // Create attachments sequentially to preserve ordering and quota logic
  for (const item of body.attachments) {
    if (
      !item ||
      typeof item.storage_key !== "string" ||
      item.storage_key.length === 0
    ) {
      throw new HttpException(
        "Bad Request: storage_key is required for each attachment",
        400,
      );
    }
    if (
      typeof item.original_filename !== "string" ||
      item.original_filename.length === 0
    ) {
      throw new HttpException(
        "Bad Request: original_filename is required for each attachment",
        400,
      );
    }
    if (
      typeof item.mime_type !== "string" ||
      !ALLOWED_MIME.has(item.mime_type)
    ) {
      throw new HttpException("Bad Request: unsupported mime_type", 400);
    }
    if (
      typeof item.size !== "number" ||
      item.size < 0 ||
      item.size > MAX_SIZE
    ) {
      throw new HttpException(
        "Bad Request: invalid or too large size for attachment",
        400,
      );
    }

    // Storage existence & scanning integration placeholder
    // NOTE: A storage existence check and malware/abuse scanning integration
    // should run here. If storage cannot be verified, the correct behavior is
    // to return 422. This environment lacks a storage service API, so we
    // optimistically proceed while marking quarantined=false. Integrate
    // MyGlobal.storage or a scanning service for production.

    await MyGlobal.prisma.discussion_board_comment_attachments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_comment_id: commentId,
        discussion_board_uploaded_by_id: member.id,
        original_filename: item.original_filename,
        storage_key: item.storage_key,
        mime_type: item.mime_type,
        size: item.size,
        is_image: item.is_image ?? item.mime_type.startsWith("image/"),
        quarantined: false,
        created_at: now,
      },
    });
  }

  // Fetch attachments to return a summary page
  const rows =
    await MyGlobal.prisma.discussion_board_comment_attachments.findMany({
      where: { discussion_board_comment_id: commentId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            display_name: true,
            created_at: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

  const mapped = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    commentId: r.discussion_board_comment_id as string & tags.Format<"uuid">,
    originalFilename: r.original_filename,
    mimeType: r.mime_type,
    size: Number(r.size),
    isImage: r.is_image,
    quarantined: r.quarantined,
    createdAt: r.created_at ? toISOStringSafe(r.created_at) : now,
    downloadUrl: null,
    cdnUrl: null,
    uploader: r.uploadedBy
      ? {
          id: r.uploadedBy.id as string & tags.Format<"uuid">,
          username: r.uploadedBy.username,
          display_name: r.uploadedBy.display_name ?? null,
          created_at: toISOStringSafe(r.uploadedBy.created_at),
        }
      : null,
  }));

  const records = mapped.length;
  const limit = records === 0 ? 10 : records;

  return {
    pagination: {
      current: Number(1),
      limit: Number(limit),
      records: Number(records),
      pages: Number(Math.ceil(records / limit)),
    },
    data: mapped,
  };
}
