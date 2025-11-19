import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberArticlesArticleIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.findUnique({
      where: { id: props.attachmentId },
      include: {
        article: true,
      },
    });

  if (!attachment || attachment.deleted_at !== null) {
    throw new HttpException("Attachment not found", 404);
  }

  if (attachment.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Attachment does not belong to the specified article",
      404,
    );
  }

  if (attachment.article.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "You do not have permission to delete this attachment",
      403,
    );
  }

  if (attachment.article.deleted_at !== null) {
    throw new HttpException(
      "Cannot delete attachment from a deleted article",
      404,
    );
  }

  await MyGlobal.prisma.discussion_board_article_attachments.update({
    where: { id: props.attachmentId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
