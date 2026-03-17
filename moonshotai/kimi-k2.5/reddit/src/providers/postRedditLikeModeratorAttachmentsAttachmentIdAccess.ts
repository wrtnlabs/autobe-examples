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

export async function postRedditLikeModeratorAttachmentsAttachmentIdAccess(props: {
  moderator: ModeratorPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IRedditLikeAttachmentAccessLog.ICreate;
}): Promise<IRedditLikeAttachmentAccessLog> {
  // Validate attachment exists
  await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
    where: { id: props.attachmentId },
    select: { id: true },
  });
  // Create access log with moderator actor info
  const created =
    await MyGlobal.prisma.reddit_like_attachment_access_logs.create({
      data: {
        id: v4(),
        reddit_like_attachment_id: props.attachmentId,
        actor_id: props.moderator.id,
        actor_type: "moderator",
        access_type: props.body.access_type,
        ip_address: props.body.ip_address ?? null,
        user_agent: props.body.user_agent ?? null,
        referer: props.body.referer ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...RedditLikeAttachmentAccessLogTransformer.select(),
    });
  return await RedditLikeAttachmentAccessLogTransformer.transform(created);
}
