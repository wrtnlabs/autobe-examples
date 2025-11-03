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

export async function putDiscussionBoardMemberDiscussionBoardArticlesArticleIdDiscussionBoardAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IUpdate;
}): Promise<IDiscussionBoardAttachment> {
  const { member, articleId, attachmentId, body } = props;

  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirstOrThrow({
      where: {
        id: attachmentId,
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    });

  const updated = await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: attachmentId },
    data: {
      filename: body.filename ?? undefined,
      file_type: body.file_type ?? undefined,
      file_url: body.file_url ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    discussion_board_article_id: updated.discussion_board_article_id,
    filename: updated.filename,
    file_type: updated.file_type,
    file_url: updated.file_url,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
