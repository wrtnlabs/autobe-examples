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

export async function putCommunityPlatformAdminBannedUsersBannedUserId(props: {
  admin: AdminPayload;
  bannedUserId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBannedUser.IUpdate;
}): Promise<ICommunityPlatformBannedUser> {
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.community_platform_banned_users.findUnique({
      where: { id: props.bannedUserId },
    });
    if (!existing) {
      throw new HttpException("Banned user not found", 404);
    }
    const data: {
      unbanned_at?: string | null;
      reason?: string;
    } = {};
    if ("unbanned_at" in props.body) {
      if (props.body.unbanned_at === null) {
        data.unbanned_at = null;
      } else if (props.body.unbanned_at !== undefined) {
        // props.body.unbanned_at is string & tags.Format<'date-time'>
        // Assign directly without conversion
        data.unbanned_at = props.body.unbanned_at;
      }
    }
    if ("reason" in props.body) {
      data.reason = props.body.reason!;
    }
    const updated = await tx.community_platform_banned_users.update({
      where: { id: props.bannedUserId },
      data,
    });
    return updated;
  });
  return updated;
}
