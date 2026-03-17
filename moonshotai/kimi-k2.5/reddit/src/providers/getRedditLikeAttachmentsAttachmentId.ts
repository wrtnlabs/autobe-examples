import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeAttachmentTransformer } from "../transformers/RedditLikeAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeAttachmentsAttachmentId(props: {
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeAttachment> {
  // Query attachment with transformer select
  const attachment =
    await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
      where: {
        id: props.attachmentId,
        deleted_at: null,
      },
      ...RedditLikeAttachmentTransformer.select(),
    });
  // Log access for audit compliance
  await MyGlobal.prisma.reddit_like_attachment_access_logs.create({
    data: {
      id: v4(),
      reddit_like_attachment_id: props.attachmentId,
      actor_id: null,
      actor_type: null,
      access_type: "metadata_read",
      ip_address: null,
      user_agent: null,
      referer: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Transform and return
  return await RedditLikeAttachmentTransformer.transform(attachment);
}
