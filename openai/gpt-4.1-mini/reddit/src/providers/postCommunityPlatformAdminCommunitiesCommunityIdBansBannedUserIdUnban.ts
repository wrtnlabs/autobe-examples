import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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

export async function postCommunityPlatformAdminCommunitiesCommunityIdBansBannedUserIdUnban(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  bannedUserId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBan> {
  const existingBan =
    await MyGlobal.prisma.community_platform_community_bans.findUnique({
      where: {
        community_id_user_id: {
          community_id: props.communityId,
          user_id: props.bannedUserId,
        },
      },
    });
  if (!existingBan) throw new HttpException("Ban record not found", 404);
  if (existingBan.unbanned_at !== null)
    throw new HttpException("User is not currently banned", 400);
  const currentTime: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updatedBan = await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.community_platform_community_bans.update({
      where: {
        community_id_user_id: {
          community_id: props.communityId,
          user_id: props.bannedUserId,
        },
      },
      data: {
        unbanned_at: currentTime,
      },
    });
    return updated;
  });
  return updatedBan;
}
