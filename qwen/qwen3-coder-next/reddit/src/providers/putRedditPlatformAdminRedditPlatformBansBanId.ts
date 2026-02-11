import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function putRedditPlatformAdminRedditPlatformBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: IRedditPlatformBan.IUpdate;
}): Promise<IRedditPlatformBan> {
  // Validate ban exists
  const ban = await MyGlobal.prisma.reddit_platform_bans.findUnique({
    where: { id: props.banId },
  });
  if (!ban) throw new HttpException("Ban not found", 404);
  // Update the ban record with new metadata
  const updated = await MyGlobal.prisma.reddit_platform_bans.update({
    where: { id: props.banId },
    data: {
      reason: props.body.reason,
      expired_at: props.body.expired_at
        ? new Date(props.body.expired_at)
        : (ban.expired_at as any),
    },
  });
  // Transform to response DTO
  return {
    id: updated.id,
    reason: updated.reason,
    bannedAt: toISOStringSafe(updated.created_at),
    expiredAt: updated.expired_at ? toISOStringSafe(updated.expired_at) : null,
    community: {
      id: ban.community_id,
      name: "Unknown Community",
      description: null,
      iconUrl: null,
      subscriberCount: 0,
    },
    user: {
      id: ban.user_id,
      username: "Unknown User",
      displayName: null,
      avatarUrl: null,
    },
    bannedBy: {
      id: ban.banned_by_id,
      username: "Unknown Admin",
      displayName: null,
      avatarUrl: null,
    },
  };
}
