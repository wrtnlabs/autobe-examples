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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeAttachmentAccessLogTransformer } from "../transformers/RedditLikeAttachmentAccessLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberAttachmentsAttachmentIdAccess(props: {
  member: MemberPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IRedditLikeAttachmentAccessLog.ICreate;
}): Promise<IRedditLikeAttachmentAccessLog> {
  // Verify attachment exists
  await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
    where: { id: props.attachmentId },
  });
  // Prepare entity references for collector
  const attachmentEntity: IEntity = { id: props.attachmentId };
  const memberEntity: IEntity = { id: props.member.id };
  // Create access log using collector
  const created =
    await MyGlobal.prisma.reddit_like_attachment_access_logs.create({
      data: await RedditLikeAttachmentAccessLogCollector.collect({
        body: props.body,
        redditLikeAttachments: attachmentEntity,
        redditLikeMembers: memberEntity,
      }),
      ...RedditLikeAttachmentAccessLogTransformer.select(),
    });
  // Transform and return
  return await RedditLikeAttachmentAccessLogTransformer.transform(created);
}
