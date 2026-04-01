import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikeAttachmentAccessLogTransformer } from "../transformers/RedditLikeAttachmentAccessLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeGuestAttachmentsAttachmentIdAccess(props: {
  guest: GuestPayload;
  attachmentId: string & tags.Format<"uuid">;
  body: IRedditLikeAttachmentAccessLog.ICreate;
}): Promise<IRedditLikeAttachmentAccessLog> {
  // Validate attachment exists
  await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
    where: { id: props.attachmentId },
  });
  // Create access log record
  const created =
    await MyGlobal.prisma.reddit_like_attachment_access_logs.create({
      data: {
        id: v4(),
        access_type: props.body.access_type,
        actor_type: "guest",
        ip_address: props.body.ip_address ?? null,
        user_agent: props.body.user_agent ?? null,
        referer: props.body.referer ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        attachment: { connect: { id: props.attachmentId } },
        actor: { connect: { id: props.guest.id } },
      },
    });
  // Fetch with proper selection and transform
  const record =
    await MyGlobal.prisma.reddit_like_attachment_access_logs.findUniqueOrThrow({
      where: { id: created.id },
      ...RedditLikeAttachmentAccessLogTransformer.select(),
    });
  return await RedditLikeAttachmentAccessLogTransformer.transform(record);
}
