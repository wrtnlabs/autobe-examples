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

export async function putDiscussionBoardMemberDiscussionBoardArticlesIdDiscussionBoardAttachmentsAttachmentId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IUpdate;
}): Promise<IDiscussionBoardAttachment> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.id },
  });
  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUnique({
      where: { id: props.attachmentId },
    });
  if (!attachment || attachment.deleted_at !== null) {
    throw new HttpException("Attachment not found", 404);
  }
  if (attachment.discussion_board_article_id !== props.id) {
    throw new HttpException(
      "Attachment does not belong to the specified article",
      400,
    );
  }
  // Validate the type field to ensure it's either 'image' or 'file'
  if (props.body.type !== "image" && props.body.type !== "file") {
    throw new HttpException("Invalid attachment type", 400);
  }
  const updated = await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: props.attachmentId },
    data: {
      type: props.body.type,
      url: props.body.url,
      filename: props.body.filename,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    discussionBoardArticleId: updated.discussion_board_article_id,
    type: updated.type as "image" | "file",
    url: updated.url,
    fileName: updated.filename,
    createdAt: toISOStringSafe(updated.created_at),
  };
}
