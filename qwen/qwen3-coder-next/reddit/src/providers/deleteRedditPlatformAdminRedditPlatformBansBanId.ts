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

export async function deleteRedditPlatformAdminRedditPlatformBansBanId(props: {
  admin: AdminPayload;
  banId: string;
}): Promise<void> {
  const ban = await MyGlobal.prisma.reddit_platform_bans.findUnique({
    where: {
      id: props.banId,
      deleted_at: null,
    },
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  // Verify moderator permissions for the associated community
  const moderation =
    await MyGlobal.prisma.reddit_platform_moderations.findFirst({
      where: {
        community_id: ban.community_id,
        user_id: props.admin.id,
      },
    });
  if (!moderation) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if moderator has permission to unban (owner can unban all)
  if (moderation.role !== "owner" && moderation.user_id !== ban.banned_by_id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the ban record
  await MyGlobal.prisma.reddit_platform_bans.update({
    where: {
      id: props.banId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
