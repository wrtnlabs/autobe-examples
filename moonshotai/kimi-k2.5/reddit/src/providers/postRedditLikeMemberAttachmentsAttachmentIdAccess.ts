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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeAttachmentAccessLogTransformer } from "../transformers/RedditLikeAttachmentAccessLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberAttachmentsAttachmentIdAccess(props: {
  member: AdminPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IRedditLikeAttachmentAccessLog.ICreate;
}): Promise<IRedditLikeAttachmentAccessLog> {
  // Validate attachment exists
  const attachment =
    await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
      where: { id: props.attachmentId },
    });
  // Create the access log using the collector
  const log = await MyGlobal.prisma.reddit_like_attachment_access_logs.create({
    data: await RedditLikeAttachmentAccessLogCollector.collect({
      body: props.body,
      redditLikeAttachments: { id: attachment.id },
      redditLikeMembers: { id: props.member.id },
    }),
    ...RedditLikeAttachmentAccessLogTransformer.select(),
  });
  // Transform and return
  return await RedditLikeAttachmentAccessLogTransformer.transform(log);
}
