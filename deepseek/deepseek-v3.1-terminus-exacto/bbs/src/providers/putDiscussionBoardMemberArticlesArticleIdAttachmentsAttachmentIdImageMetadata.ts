import { IDiscussionBoardImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardImageAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardImageAttachmentTransformer } from "../transformers/DiscussionBoardImageAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardMemberArticlesArticleIdAttachmentsAttachmentIdImageMetadata(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardImageAttachment.IUpdate;
}): Promise<IDiscussionBoardImageAttachment> {
  // Validate article exists and member owns it
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: {
        id: props.articleId,
        deleted_at: null,
      },
    });
  // Additional check to ensure member owns the article
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Article not found", 404);
  }
  // Validate attachment exists and belongs to the article
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: {
        id: props.attachmentId,
        article_id: props.articleId,
        deleted_at: null,
      },
    });
  // Check if image metadata already exists
  const existingImageMetadata =
    await MyGlobal.prisma.discussion_board_image_attachments.findFirst({
      where: {
        discussion_board_attachment_id: props.attachmentId,
        deleted_at: null,
      },
    });
  let imageMetadata;
  if (existingImageMetadata) {
    // Update existing record
    imageMetadata =
      await MyGlobal.prisma.discussion_board_image_attachments.update({
        where: { id: existingImageMetadata.id },
        data: {
          ...(props.body.width !== undefined && { width: props.body.width }),
          ...(props.body.height !== undefined && { height: props.body.height }),
          ...(props.body.altText !== undefined && {
            alt_text: props.body.altText,
          }),
          updated_at: new Date(),
        },
        ...DiscussionBoardImageAttachmentTransformer.select(),
      });
  } else {
    // Create new image metadata record
    imageMetadata =
      await MyGlobal.prisma.discussion_board_image_attachments.create({
        data: {
          id: v4(),
          discussion_board_attachment_id: props.attachmentId,
          width: props.body.width ?? 1, // Min 1
          height: props.body.height ?? 1, // Min 1
          alt_text: props.body.altText ?? null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        ...DiscussionBoardImageAttachmentTransformer.select(),
      });
  }
  return await DiscussionBoardImageAttachmentTransformer.transform(
    imageMetadata,
  );
}
