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
  // Validate attachment exists
  await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
    where: { id: props.attachmentId },
  });
  // Validate access log exists and belongs to the specified attachment
  const log =
    await MyGlobal.prisma.reddit_like_attachment_access_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...RedditLikeAttachmentAccessLogTransformer.select(),
    });
  // Verify the log entry belongs to the specified attachment
  if (log.attachment.id !== props.attachmentId) {
    throw new HttpException("Access log not found for this attachment", 404);
  }
  return await RedditLikeAttachmentAccessLogTransformer.transform(log);
}
