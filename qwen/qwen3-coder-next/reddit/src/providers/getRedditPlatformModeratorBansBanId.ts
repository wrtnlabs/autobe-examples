import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
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

export async function getRedditPlatformModeratorBansBanId(props: {
  moderator: ModeratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformBan> {
  const ban = await MyGlobal.prisma.reddit_platform_bans.findUnique({
    where: { id: props.banId },
  });
  if (!ban || ban.deleted_at !== null) {
    throw new HttpException("Ban not found", 404);
  }
  return {
    id: ban.id,
    community_id: ban.community_id,
    user_id: ban.user_id,
    banned_by_id: ban.banned_by_id,
    created_at: toISOStringSafe(ban.created_at),
    expires_at: ban.expires_at ? toISOStringSafe(ban.expires_at) : null,
    deleted_at: ban.deleted_at ? toISOStringSafe(ban.deleted_at) : null,
  };
}
