import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardMemberDiscussionBoardArticlesArticleIdDiscussionBoardAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachment> {
  const { member, articleId, attachmentId } = props;

  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: {
        id: attachmentId,
        discussion_board_article_id: articleId,
      },
      select: {
        id: true,
        discussion_board_article_id: true,
        filename: true,
        file_type: true,
        file_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: attachment.id,
    discussion_board_article_id: attachment.discussion_board_article_id,
    filename: attachment.filename,
    file_type: attachment.file_type,
    file_url: attachment.file_url,
    created_at: toISOStringSafe(attachment.created_at),
    updated_at: toISOStringSafe(attachment.updated_at),
    deleted_at: attachment.deleted_at
      ? toISOStringSafe(attachment.deleted_at)
      : null,
  };
}
