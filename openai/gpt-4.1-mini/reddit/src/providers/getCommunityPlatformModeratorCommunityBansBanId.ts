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

export async function getCommunityPlatformModeratorCommunityBansBanId(props: {
  moderator: ModeratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBan> {
  const record =
    await MyGlobal.prisma.community_platform_community_bans.findUnique({
      where: { id: props.banId },
      select: {
        id: true,
        community_id: true,
        user_id: true,
        banned_at: true,
        unbanned_at: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) throw new HttpException("Ban not found", 404);
  return {
    id: record.id,
    community_id: record.community_id,
    user_id: record.user_id,
    banned_at: toISOStringSafe(record.banned_at),
    unbanned_at:
      record.unbanned_at === null ? null : toISOStringSafe(record.unbanned_at),
    reason: record.reason,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
