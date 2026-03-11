import { IDiscussionBoardImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardImageAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardImageAttachmentTransformer } from "../transformers/DiscussionBoardImageAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdAttachmentsAttachmentIdImageMetadata(props: {
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardImageAttachment> {
  // Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId, deleted_at: null },
  });
  // Verify attachment exists and belongs to article
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: {
        id: props.attachmentId,
        article_id: props.articleId,
        deleted_at: null,
      },
    });
  // Fetch image metadata with transformer
  const imageMetadata =
    await MyGlobal.prisma.discussion_board_image_attachments.findUniqueOrThrow({
      where: {
        discussion_board_attachment_id: attachment.id,
        deleted_at: null,
      },
      ...DiscussionBoardImageAttachmentTransformer.select(),
    });
  // Transform and return using the transformer
  return await DiscussionBoardImageAttachmentTransformer.transform(
    imageMetadata,
  );
}
