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

export async function putCommunityPlatformAdminCommunityBannedUsersBannedUserId(props: {
  admin: AdminPayload;
  bannedUserId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBannedUser.IUpdate;
}): Promise<ICommunityPlatformCommunityBannedUser> {
  // Check existence of the banned user record
  const existingRecord =
    await MyGlobal.prisma.community_platform_community_banned_users.findUnique({
      where: { id: props.bannedUserId },
    });
  if (!existingRecord) {
    throw new HttpException("Banned user record not found", 404);
  }
  // Update data object: Use only the 'updated_at' since 'ban_reason' and 'unbanned_at' don't exist on props.body
  const updateData: {
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">,
  };
  const updated =
    await MyGlobal.prisma.community_platform_community_banned_users.update({
      where: { id: props.bannedUserId },
      data: updateData,
    });
  // Return all fields with date-time conversion using toISOStringSafe and proper null handling
  return {
    id: updated.id,
    community_id: updated.community_id,
    user_id: updated.user_id,
    banned_at: toISOStringSafe(updated.banned_at) as string &
      tags.Format<"date-time">,
    unbanned_at:
      updated.unbanned_at === null
        ? null
        : (toISOStringSafe(updated.unbanned_at) as string &
            tags.Format<"date-time">),
    ban_reason: updated.ban_reason,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      updated.deleted_at === null
        ? null
        : (toISOStringSafe(updated.deleted_at) as string &
            tags.Format<"date-time">),
  };
}
