import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminDiscussionBoardArticlesArticleIdDiscussionBoardAttachmentsAttachmentId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IUpdate;
}): Promise<IDiscussionBoardAttachment> {
  const { articleId, attachmentId, body } = props;

  const updated = await MyGlobal.prisma.discussion_board_attachments.update({
    where: {
      id: attachmentId,
      discussion_board_article_id: articleId,
    },
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
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
