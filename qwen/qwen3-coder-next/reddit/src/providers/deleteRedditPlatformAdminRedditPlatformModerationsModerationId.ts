import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformAdminRedditPlatformModerationsModerationId(props: {
  admin: AdminPayload;
  moderationId: string;
}): Promise<IRedditPlatformModeration> {
  const moderation =
    await MyGlobal.prisma.reddit_platform_moderations.findUnique({
      where: { id: props.moderationId },
      include: {
        community: true,
        user: true,
      },
    });
  if (!moderation) throw new HttpException("Moderation not found", 404);
  // Authorization: admin or community owner only
  const isOwner = moderation.user_id === moderation.community.owner_id;
  if (props.admin.type !== "admin" && !isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  const deleted = await MyGlobal.prisma.reddit_platform_moderations.delete({
    where: { id: props.moderationId },
  });
  return {
    id: deleted.id,
    community_id: deleted.community_id,
    user_id: deleted.user_id,
    role: deleted.role as "OWNER" | "MODERATOR",
    created_at: toISOStringSafe(deleted.created_at),
    community: {
      id: moderation.community.id,
      name: moderation.community.name,
      description: moderation.community.description ?? null,
      iconUrl: moderation.community.icon_url ?? null,
      subscriberCount: moderation.community.subscriber_count,
    },
    user: {
      id: moderation.user.id,
      username: moderation.user.username,
      displayName: moderation.user.display_name ?? null,
      avatarUrl: moderation.user.avatar_url ?? null,
    },
  };
}
