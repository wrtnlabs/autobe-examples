import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeAttachmentAccessLogTransformer } from "../transformers/RedditLikeAttachmentAccessLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeModeratorAttachmentsAttachmentIdAccessLogsLogId(props: {
  moderator: ModeratorPayload;
  attachmentId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeAttachmentAccessLog> {
  // Verify attachment exists (404 if not found)
  await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
    where: { id: props.attachmentId },
    select: { id: true },
  });
  // Retrieve the access log belonging to the specified attachment
  // Will throw 404 if log doesn't exist or doesn't belong to this attachment
  const log =
    await MyGlobal.prisma.reddit_like_attachment_access_logs.findUniqueOrThrow({
      where: {
        id: props.logId,
        reddit_like_attachment_id: props.attachmentId,
      },
      ...RedditLikeAttachmentAccessLogTransformer.select(),
    });
  return await RedditLikeAttachmentAccessLogTransformer.transform(log);
}
