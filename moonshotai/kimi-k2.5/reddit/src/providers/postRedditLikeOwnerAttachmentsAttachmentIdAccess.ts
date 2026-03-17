import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeAttachmentAccessLogCollector } from "../collectors/RedditLikeAttachmentAccessLogCollector";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeAttachmentAccessLogTransformer } from "../transformers/RedditLikeAttachmentAccessLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeOwnerAttachmentsAttachmentIdAccess(props: {
  owner: OwnerPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IRedditLikeAttachmentAccessLog.ICreate;
}): Promise<IRedditLikeAttachmentAccessLog> {
  // Validate attachment exists
  await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
    where: { id: props.attachmentId },
  });
  // Create access log using collector for data construction
  const log = await MyGlobal.prisma.reddit_like_attachment_access_logs.create({
    data: await RedditLikeAttachmentAccessLogCollector.collect({
      body: props.body,
      redditLikeAttachments: { id: props.attachmentId },
      redditLikeMembers: { id: props.owner.id },
    }),
    ...RedditLikeAttachmentAccessLogTransformer.select(),
  });
  // Transform and return the result
  return await RedditLikeAttachmentAccessLogTransformer.transform(log);
}
