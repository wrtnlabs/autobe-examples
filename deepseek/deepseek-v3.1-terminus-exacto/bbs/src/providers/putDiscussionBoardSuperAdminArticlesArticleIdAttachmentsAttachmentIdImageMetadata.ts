import { IDiscussionBoardImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardImageAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardImageAttachmentTransformer } from "../transformers/DiscussionBoardImageAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminArticlesArticleIdAttachmentsAttachmentIdImageMetadata(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardImageAttachment.IUpdate;
}): Promise<IDiscussionBoardImageAttachment> {
  // 1. Article 존재 확인
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // 2. Attachment 존재 확인 및 article 속성 확인
  await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
    where: {
      id: props.attachmentId,
      article_id: props.articleId, // attachment가 해당 article에 속하는지 확인
    },
  });
  // 3. 기존 이미지 메타데이터 확인
  const existingImageMetadata =
    await MyGlobal.prisma.discussion_board_image_attachments.findUnique({
      where: { discussion_board_attachment_id: props.attachmentId },
    });
  let imageMetadata;
  const now = new Date();
  if (!existingImageMetadata) {
    // 4. 새 이미지 메타데이터 생성
    if (props.body.width === undefined || props.body.height === undefined) {
      throw new HttpException(
        "Width and height are required for new image metadata",
        400,
      );
    }
    imageMetadata =
      await MyGlobal.prisma.discussion_board_image_attachments.create({
        data: {
          id: v4(),
          width: props.body.width,
          height: props.body.height,
          alt_text: props.body.altText ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          attachment: {
            connect: { id: props.attachmentId },
          },
        },
      });
  } else {
    // 5. 기존 이미지 메타데이터 업데이트
    const updateData = {
      ...(props.body.width !== undefined && { width: props.body.width }),
      ...(props.body.height !== undefined && { height: props.body.height }),
      ...(props.body.altText !== undefined && { alt_text: props.body.altText }),
      updated_at: now,
    };
    imageMetadata =
      await MyGlobal.prisma.discussion_board_image_attachments.update({
        where: { id: existingImageMetadata.id },
        data: updateData,
      });
  }
  // 6. Transformer로 응답 변환 (관계 포함 조회)
  const imageMetadataWithRelations =
    await MyGlobal.prisma.discussion_board_image_attachments.findUniqueOrThrow({
      where: { id: imageMetadata.id },
      ...DiscussionBoardImageAttachmentTransformer.select(),
    });
  return await DiscussionBoardImageAttachmentTransformer.transform(
    imageMetadataWithRelations,
  );
}
