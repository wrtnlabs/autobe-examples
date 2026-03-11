import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdAttachmentsAttachmentIdDownload(props: {
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify article exists and is not deleted
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: {
        id: props.articleId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        section: true, // Changed from section_id to section
      },
    });
  // Verify attachment exists, belongs to article, and is not deleted
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: {
        id: props.attachmentId,
        article_id: props.articleId,
        deleted_at: null,
      },
      select: {
        id: true,
        filename: true,
        mime_type: true,
        storage_path: true,
        size_bytes: true,
      },
    });
  // Determine actor type and get session info
  // Since authorizationActor is null, need to determine from request context
  // Based on analysis sections, guests can download, but need actor_type for tracking
  // Will need to implement actor detection logic
  // Create download record
  const downloadId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.discussion_board_attachment_downloads.create({
    data: {
      id: downloadId,
      discussion_board_attachment_id: attachment.id,
      actor_type: "guest", // TODO: Determine from request
      ip: "127.0.0.1", // TODO: Get from request
      user_agent: "unknown", // TODO: Get from request
      referrer: null,
      created_at: new Date(),
      deleted_at: null,
    },
  });
  // TODO: Retrieve file from storage using attachment.storage_path
  // TODO: Set appropriate headers: Content-Type, Content-Disposition, Content-Length
  // TODO: Stream file to response
  throw new Error("Not implemented: file serving logic");
}
