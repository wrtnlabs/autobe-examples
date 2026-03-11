import { IDiscussionBoardImageAttachmentExifDatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardImageAttachmentExifDatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardImageAttachmentExifDatumTransformer } from "../transformers/DiscussionBoardImageAttachmentExifDatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdAttachmentsAttachmentIdImageMetadataExif(props: {
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardImageAttachmentExifDatum> {
  // First, verify the attachment exists and belongs to the article
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: {
        id: props.attachmentId,
        article_id: props.articleId,
      },
      select: {
        id: true,
        imageMetadatum: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_image_attachmentsFindManyArgs,
      },
    });
  // Check if attachment has image metadata
  if (!attachment.imageMetadatum) {
    throw new HttpException("Attachment does not have image metadata", 404);
  }
  // Query for EXIF data through the image metadata relationship
  const exifData =
    await MyGlobal.prisma.discussion_board_image_attachment_exif_data.findUniqueOrThrow(
      {
        where: {
          discussion_board_image_attachment_id: attachment.imageMetadatum.id,
        },
        ...DiscussionBoardImageAttachmentExifDatumTransformer.select(),
      },
    );
  // Transform and return EXIF data
  return await DiscussionBoardImageAttachmentExifDatumTransformer.transform(
    exifData,
  );
}
