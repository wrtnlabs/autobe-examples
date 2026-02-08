import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdBansBannedUserIdUnban(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  bannedUserId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBan> {
  const ban =
    await MyGlobal.prisma.community_platform_community_bans.findUnique({
      where: {
        community_id_user_id: {
          community_id: props.communityId,
          user_id: props.bannedUserId,
        },
      },
    });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  if (ban.unbanned_at !== null) {
    throw new HttpException("User already unbanned", 400);
  }
  const nowIsoString = toISOStringSafe(new Date());
  const updatedBan = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.community_platform_community_bans.update({
      where: {
        community_id_user_id: {
          community_id: props.communityId,
          user_id: props.bannedUserId,
        },
      },
      data: {
        unbanned_at: nowIsoString,
      },
    });
  });
  return {
    ...updatedBan,
    unbanned_at: updatedBan.unbanned_at ?? null,
    banned_at: updatedBan.banned_at
      ? toISOStringSafe(updatedBan.banned_at)
      : null,
  };
}
