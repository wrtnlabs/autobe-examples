import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorsModeratorId(props: {
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerator> {
  const record = await MyGlobal.prisma.community_platform_moderators.findUnique(
    {
      where: { id: props.moderatorId },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (!record) throw new HttpException("Moderator not found", 404);
  return {
    id: record.id,
    email: record.email,
    username: record.username,
    display_name: record.display_name,
    bio: record.bio === null ? undefined : record.bio,
    avatar_url: record.avatar_url === null ? undefined : record.avatar_url,
    karma: record.karma,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
