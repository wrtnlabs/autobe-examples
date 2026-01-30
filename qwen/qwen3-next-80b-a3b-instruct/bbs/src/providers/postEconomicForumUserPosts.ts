import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicForumPostCollector } from "../collectors/EconomicForumPostCollector";

export async function postEconomicForumUserPosts(props: {
  user: UserPayload;
  body: IEconomicForumPost.ICreate;
}): Promise<IEconomicForumPost> {
  // Convert API DTO to Prisma CreateInput using existing collector
  const created = await MyGlobal.prisma.economic_forum_posts.create({
    data: await EconomicForumPostCollector.collect({
      body: props.body,
      economicForumUsers: { id: props.user.id },
      economicForumUserSessions: { id: props.user.session_id },
    }),
  });
  // Manually construct IEconomicForumPost response since transformer doesn't exist
  // Query attachments for this post
  const attachments =
    await MyGlobal.prisma.economic_forum_post_attachments.findMany({
      where: {
        economic_forum_post_id: created.id,
      },
      select: {
        economic_forum_attachment_file_id: true,
      },
    });
  // Extract attachment file IDs for response
  const attachmentIds = attachments.map(
    (attachment) => attachment.economic_forum_attachment_file_id,
  );
  // Return IEconomicForumPost with manual construction
  return {
    id: created.id,
    title: created.title,
    body: created.body,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    user_id: created.economic_forum_user_id,
    attachments: attachmentIds,
  };
}
