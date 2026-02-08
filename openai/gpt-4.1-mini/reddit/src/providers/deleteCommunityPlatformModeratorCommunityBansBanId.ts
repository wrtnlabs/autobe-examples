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

export async function deleteCommunityPlatformModeratorCommunityBansBanId(props: {
  moderator: ModeratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const ban = await MyGlobal.prisma.community_platform_community_bans.findFirst(
    {
      where: {
        id: props.banId,
        deleted_at: null,
      },
    },
  );
  if (ban === null) {
    throw new HttpException("Ban record not found", 404);
  }
  const isAuthorized =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        id: props.moderator.id,
        community_id: ban.community_id,
        deleted_at: null,
      },
    });
  if (isAuthorized === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_community_bans.delete({
    where: { id: props.banId },
  });
}
