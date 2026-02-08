import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
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

export async function getCommunityPlatformAdminCommunityBannedUsersBannedUserId(props: {
  admin: AdminPayload;
  bannedUserId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBannedUser> {
  const bannedUser =
    await MyGlobal.prisma.community_platform_community_banned_users.findUnique({
      where: { id: props.bannedUserId },
      select: {
        id: true,
        community_id: true,
        user_id: true,
        banned_at: true,
        unbanned_at: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!bannedUser) {
    throw new HttpException("Banned user record not found", 404);
  }
  return bannedUser;
}
