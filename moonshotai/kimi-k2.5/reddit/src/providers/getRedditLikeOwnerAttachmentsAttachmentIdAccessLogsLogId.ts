import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeAttachmentAccessLogTransformer } from "../transformers/RedditLikeAttachmentAccessLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeOwnerAttachmentsAttachmentIdAccessLogsLogId(props: {
  owner: OwnerPayload;
  attachmentId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeAttachmentAccessLog> {
  // Verify attachment exists
  await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
    where: { id: props.attachmentId },
  });
  // Fetch access log with transformer select
  const log =
    await MyGlobal.prisma.reddit_like_attachment_access_logs.findUnique({
      where: { id: props.logId },
      ...RedditLikeAttachmentAccessLogTransformer.select(),
    });
  // Return 404 if log doesn't exist or belongs to different attachment
  if (log === null || log.reddit_like_attachment_id !== props.attachmentId) {
    throw new HttpException("Access log not found", 404);
  }
  return await RedditLikeAttachmentAccessLogTransformer.transform(log);
}
