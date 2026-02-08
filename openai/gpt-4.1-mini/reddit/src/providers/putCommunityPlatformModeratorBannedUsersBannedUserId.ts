import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
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

export async function putCommunityPlatformModeratorBannedUsersBannedUserId(props: {
  moderator: ModeratorPayload;
  bannedUserId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBannedUser.IUpdate;
}): Promise<ICommunityPlatformBannedUser> {
  const existing =
    await MyGlobal.prisma.community_platform_banned_users.findUnique({
      where: { id: props.bannedUserId },
    });
  if (!existing) {
    throw new HttpException("Banned user record not found", 404);
  }
  const updated = await MyGlobal.prisma.community_platform_banned_users.update({
    where: { id: props.bannedUserId },
    data: {},
  });
  return updated;
}
