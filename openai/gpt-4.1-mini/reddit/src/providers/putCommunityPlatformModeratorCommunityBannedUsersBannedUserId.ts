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

export async function putCommunityPlatformModeratorCommunityBannedUsersBannedUserId(props: {
  moderator: ModeratorPayload;
  bannedUserId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBannedUser.IUpdate;
}): Promise<ICommunityPlatformCommunityBannedUser> {
  const bannedUser =
    await MyGlobal.prisma.community_platform_community_banned_users.findUnique({
      where: { id: props.bannedUserId },
    });
  if (bannedUser === null) {
    throw new HttpException("Banned user not found", 404);
  }
  const updated =
    await MyGlobal.prisma.community_platform_community_banned_users.update({
      where: { id: props.bannedUserId },
      data: {
        ...props.body,
      },
    });
  return updated;
}
