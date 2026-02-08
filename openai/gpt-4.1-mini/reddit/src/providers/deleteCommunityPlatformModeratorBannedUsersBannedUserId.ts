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

export async function deleteCommunityPlatformModeratorBannedUsersBannedUserId(props: {
  moderator: ModeratorPayload;
  bannedUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the banned user record exists
  const bannedUser =
    await MyGlobal.prisma.community_platform_banned_users.findUnique({
      where: { id: props.bannedUserId },
      select: { id: true },
    });
  if (!bannedUser) {
    throw new HttpException("Banned user not found", 404);
  }
  await MyGlobal.prisma.community_platform_banned_users.delete({
    where: { id: props.bannedUserId },
  });
}
