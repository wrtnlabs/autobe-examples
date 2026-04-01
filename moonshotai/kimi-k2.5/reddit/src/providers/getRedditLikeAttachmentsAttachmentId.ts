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
  const attachment =
    await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
      where: {
        id: props.attachmentId,
        deleted_at: null,
      },
      ...RedditLikeAttachmentTransformer.select(),
    });
  await MyGlobal.prisma.reddit_like_attachment_access_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      attachment: { connect: { id: props.attachmentId } },
      access_type: "metadata_read",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return await RedditLikeAttachmentTransformer.transform(attachment);
}
