import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticlesArticleIdAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.ICreate;
}): Promise<IDiscussionBoardAttachment> {
  const { member, articleId, body } = props;

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { id: true, discussion_board_member_id: true, deleted_at: true },
  });
  if (!article)
    throw new HttpException("Not Found: article does not exist", 404);
  if (article.deleted_at !== null)
    throw new HttpException("Not Found: article is deleted", 404);

  if (article.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Forbidden: only the article author may upload attachments",
      403,
    );
  }

  const allowedMimeTypes = new Set<string>([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]);
  if (!allowedMimeTypes.has(body.mime_type)) {
    throw new HttpException("Bad Request: unsupported mime type", 400);
  }

  const IMAGE_LIMIT = 5_242_880;
  const DOC_LIMIT = 20_971_520;
  if (body.is_image) {
    if (body.size > IMAGE_LIMIT)
      throw new HttpException(
        "Payload Too Large: image exceeds 5 MB limit",
        413,
      );
  } else {
    if (body.size > DOC_LIMIT)
      throw new HttpException(
        "Payload Too Large: document exceeds 20 MB limit",
        413,
      );
  }

  const totalCount = await MyGlobal.prisma.discussion_board_attachments.count({
    where: { discussion_board_article_id: articleId, deleted_at: null },
  });
  if (totalCount + 1 > 5)
    throw new HttpException(
      "Conflict: attachment quota (max 5) exceeded for this article",
      409,
    );

  const imageCount = await MyGlobal.prisma.discussion_board_attachments.count({
    where: {
      discussion_board_article_id: articleId,
      is_image: true,
      deleted_at: null,
    },
  });
  if (body.is_image && imageCount + 1 > 3)
    throw new HttpException(
      "Conflict: image quota (max 3) exceeded for this article",
      409,
    );

  const now = toISOStringSafe(new Date());
  const attachmentId = v4() as string & tags.Format<"uuid">;
  const auditId = v4() as string & tags.Format<"uuid">;

  const [created] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_attachments.create({
      data: {
        id: attachmentId,
        discussion_board_article_id: articleId,
        discussion_board_member_id: member.id,
        original_filename: body.original_filename,
        storage_key: body.storage_key,
        mime_type: body.mime_type,
        size: body.size,
        is_image: body.is_image ?? false,
        created_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: auditId,
        event_type: "attachment.uploaded",
        metadata: JSON.stringify({
          attachment_id: attachmentId,
          article_id: articleId,
          member_id: member.id,
          original_filename: body.original_filename,
        }),
        event_timestamp: now,
        resource_type: "article",
        resource_id: articleId,
        actor_type: "member",
        actor_id: member.id,
        created_at: now,
        updated_at: now,
      },
    }),
  ]);

  const uploader = await MyGlobal.prisma.discussion_board_member.findUnique({
    where: { id: member.id },
    select: { id: true, username: true, display_name: true, created_at: true },
  });

  const response: IDiscussionBoardAttachment = {
    id: created.id as string & tags.Format<"uuid">,
    article_id: created.discussion_board_article_id as string &
      tags.Format<"uuid">,
    original_filename: created.original_filename,
    storage_key: created.storage_key,
    mime_type: created.mime_type,
    size: created.size,
    is_image: created.is_image,
    created_at: now,
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    uploader: uploader
      ? {
          id: uploader.id as string & tags.Format<"uuid">,
          username: uploader.username,
          display_name: uploader.display_name ?? null,
          created_at: toISOStringSafe(uploader.created_at),
        }
      : undefined,
  };

  return response;
}
