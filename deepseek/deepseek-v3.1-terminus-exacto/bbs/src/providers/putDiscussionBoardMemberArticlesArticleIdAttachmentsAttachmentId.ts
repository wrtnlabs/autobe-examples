import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAttachmentTransformer } from "../transformers/DiscussionBoardAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardMemberArticlesArticleIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IUpdate;
}): Promise<IDiscussionBoardAttachment> {
  // Verify article exists and member owns it
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, discussion_board_member_id: true },
    });
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify attachment exists and belongs to the article
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: { id: props.attachmentId },
      select: { id: true, article_id: true, deleted_at: true },
    });
  if (attachment.article_id !== props.articleId) {
    throw new HttpException(
      "Attachment does not belong to the specified article",
      400,
    );
  }
  if (attachment.deleted_at !== null) {
    throw new HttpException("Attachment has been deleted", 404);
  }
  // Check filename uniqueness if filename is being updated
  if (props.body.filename !== undefined) {
    const existingWithSameName =
      await MyGlobal.prisma.discussion_board_attachments.findFirst({
        where: {
          article_id: props.articleId,
          filename: props.body.filename,
          id: { not: props.attachmentId },
          deleted_at: null,
        },
      });
    if (existingWithSameName !== null) {
      throw new HttpException(
        "Filename must be unique within the article",
        400,
      );
    }
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_attachmentsUpdateInput = {
    ...(props.body.filename !== undefined && { filename: props.body.filename }),
    ...(props.body.filetype !== undefined && { filetype: props.body.filetype }),
    ...(props.body.mime_type !== undefined && {
      mime_type: props.body.mime_type,
    }),
    updated_at: new Date(),
  };
  // Perform update
  await MyGlobal.prisma.discussion_board_attachments.update({
    where: { id: props.attachmentId },
    data: updateData,
  });
  // Retrieve updated attachment with transformer
  const updatedAttachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: { id: props.attachmentId },
      ...DiscussionBoardAttachmentTransformer.select(),
    });
  return await DiscussionBoardAttachmentTransformer.transform(
    updatedAttachment,
  );
}
