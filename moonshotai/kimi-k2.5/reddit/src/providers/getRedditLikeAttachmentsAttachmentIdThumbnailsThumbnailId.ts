import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeAttachmentThumbnailTransformer } from "../transformers/RedditLikeAttachmentThumbnailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeAttachmentsAttachmentIdThumbnailsThumbnailId(props: {
  attachmentId: string & tags.Format<"uuid">;
  thumbnailId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeAttachmentThumbnail> {
  const thumbnail =
    await MyGlobal.prisma.reddit_like_attachment_thumbnails.findUniqueOrThrow({
      where: {
        id: props.thumbnailId,
        reddit_like_attachment_id: props.attachmentId,
      },
      ...RedditLikeAttachmentThumbnailTransformer.select(),
    });
  return await RedditLikeAttachmentThumbnailTransformer.transform(thumbnail);
}
