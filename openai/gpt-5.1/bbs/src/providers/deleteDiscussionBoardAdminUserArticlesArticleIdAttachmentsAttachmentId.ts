import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteDiscussionBoardAdminUserArticlesArticleIdAttachmentsAttachmentId(props: {
  adminUser: AdminuserPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { articleId, attachmentId } = props;

  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: attachmentId,
        discussion_board_article_id: articleId,
      },
    });

  if (attachment === null) {
    throw new HttpException("Attachment not found for this article", 404);
  }

  if (attachment.deleted_at !== null) {
    // Already logically deleted - treat as idempotent success
    return;
  }

  await MyGlobal.prisma.discussion_board_attachments.update({
    where: {
      id: attachmentId,
    },
    data: {
      deleted_at: new Date(),
      status: "deleted",
    },
  });
}
