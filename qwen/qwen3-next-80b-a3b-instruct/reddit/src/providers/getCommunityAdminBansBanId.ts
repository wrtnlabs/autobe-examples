import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
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

export async function getCommunityAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string;
}): Promise<ICommunityBannedUser> {
  const ban = await MyGlobal.prisma.community_bans.findUnique({
    where: { id: props.banId },
    select: {
      id: true,
      community: { select: { id: true } },
      bannedUser: { select: { id: true } },
      bannedBy: { select: { id: true } },
      reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!ban) throw new HttpException("Ban not found", 404);
  // Authorization: Admin can access any ban (admin privilege)
  // No additional checks needed as props.admin confirms admin role
  return {
    id: ban.id,
    community_id: ban.community.id,
    banned_user_id: ban.bannedUser.id,
    banned_by_id: ban.bannedBy.id,
    reason: ban.reason,
    created_at: toISOStringSafe(ban.created_at),
    updated_at: toISOStringSafe(ban.updated_at),
    deleted_at: ban.deleted_at ? toISOStringSafe(ban.deleted_at) : null,
  };
}
