import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBan> {
  const ban = await MyGlobal.prisma.community_platform_community_bans.findFirst(
    {
      where: {
        id: props.banId,
        community_platform_community_id: props.communityId,
      },
      include: {
        community: true,
        user: true,
        bannedBy: true,
      },
    },
  );
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  return {
    id: ban.id,
    community: {
      id: ban.community.id,
      name: ban.community.name,
      description: ban.community.description,
    },
    user: {
      id: ban.user.id,
      display_name: ban.user.display_name,
    },
    bannedBy: {
      id: ban.bannedBy.id,
      display_name: ban.bannedBy.display_name,
    },
    reason: ban.reason,
    banned_at: toISOStringSafe(ban.banned_at),
    expires_at: ban.expires_at ? toISOStringSafe(ban.expires_at) : undefined,
    revoked_at: ban.revoked_at ? toISOStringSafe(ban.revoked_at) : undefined,
  };
}
