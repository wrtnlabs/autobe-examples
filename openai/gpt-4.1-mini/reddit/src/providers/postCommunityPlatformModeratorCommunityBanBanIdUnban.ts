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

export async function postCommunityPlatformModeratorCommunityBanBanIdUnban(props: {
  moderator: ModeratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBan> {
  const ban = await MyGlobal.prisma.community_platform_community_bans.findFirst(
    {
      where: {
        id: props.banId,
        unbanned_at: null,
      },
    },
  );
  if (ban === null) {
    throw new HttpException("Ban not found or already unbanned", 404);
  }
  const now = toISOStringSafe(new Date());
  const updatedBan =
    await MyGlobal.prisma.community_platform_community_bans.update({
      where: { id: props.banId },
      data: {
        unbanned_at: now,
      },
    });
  return updatedBan;
}
