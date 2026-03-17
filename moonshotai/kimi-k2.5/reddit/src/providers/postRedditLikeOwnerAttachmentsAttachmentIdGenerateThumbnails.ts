import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeAttachmentThumbnailCollector } from "../collectors/RedditLikeAttachmentThumbnailCollector";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeAttachmentThumbnailTransformer } from "../transformers/RedditLikeAttachmentThumbnailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeOwnerAttachmentsAttachmentIdGenerateThumbnails(props: {
  owner: OwnerPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IRedditLikeAttachmentThumbnail.ICreate;
}): Promise<IRedditLikeAttachmentThumbnail> {
  // Verify the attachment exists
  const attachment =
    await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
      where: { id: props.attachmentId },
    });
  // Create the thumbnail using the collector
  const created =
    await MyGlobal.prisma.reddit_like_attachment_thumbnails.create({
      data: await RedditLikeAttachmentThumbnailCollector.collect({
        body: props.body,
        redditLikeAttachments: { id: attachment.id },
      }),
      ...RedditLikeAttachmentThumbnailTransformer.select(),
    });
  return await RedditLikeAttachmentThumbnailTransformer.transform(created);
}
