import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
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

export async function getCommunityPlatformModeratorCommunityBannedUsersBannedUserId(props: {
  moderator: ModeratorPayload;
  bannedUserId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBannedUser> {
  const record =
    await MyGlobal.prisma.community_platform_community_banned_users.findFirst({
      where: { id: props.bannedUserId, deleted_at: null },
    });
  if (!record) throw new HttpException("Banned user record not found", 404);
  return record;
}
