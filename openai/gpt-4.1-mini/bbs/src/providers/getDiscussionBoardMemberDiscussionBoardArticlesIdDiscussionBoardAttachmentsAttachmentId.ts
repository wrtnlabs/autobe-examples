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

export async function getDiscussionBoardMemberDiscussionBoardArticlesIdDiscussionBoardAttachmentsAttachmentId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAttachment> {
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_article_id: props.id,
        deleted_at: null,
      },
    });

  if (attachment === null) {
    throw new HttpException("Attachment not found", 404);
  }

  return {
    id: attachment.id,
    discussionBoardArticleId: attachment.discussion_board_article_id,
    type: typia.assert<"image" | "file">(attachment.type),
    url: attachment.url,
    fileName: attachment.filename,
    createdAt: toISOStringSafe(attachment.created_at),
  };
}
