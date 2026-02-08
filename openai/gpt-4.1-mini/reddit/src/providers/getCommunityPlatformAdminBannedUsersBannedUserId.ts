import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformAdminBannedUsersBannedUserId(props: {
  admin: AdminPayload;
  bannedUserId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformBannedUser> {
  const bannedUser =
    await MyGlobal.prisma.community_platform_banned_users.findUnique({
      where: { id: props.bannedUserId },
      select: {
        id: true,
        community_platform_user_id: true,
        community_platform_community_id: true,
        reason: true,
        banned_at: true,
        unbanned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!bannedUser) {
    throw new HttpException("Banned user not found", 404);
  }
  return {
    id: bannedUser.id,
    user_id: bannedUser.community_platform_user_id,
    community_id: bannedUser.community_platform_community_id,
    ban_reason: bannedUser.reason ?? null,
    ban_at: bannedUser.banned_at ? toISOStringSafe(bannedUser.banned_at) : null,
    unban_at: bannedUser.unbanned_at
      ? toISOStringSafe(bannedUser.unbanned_at)
      : null,
    created_at: toISOStringSafe(bannedUser.created_at),
    updated_at: toISOStringSafe(bannedUser.updated_at),
    deleted_at: bannedUser.deleted_at
      ? toISOStringSafe(bannedUser.deleted_at)
      : null,
    user: null,
    community: null,
  };
}
