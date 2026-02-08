import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityBannedUserCollector } from "../collectors/CommunityPlatformCommunityBannedUserCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunityBannedUsers(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunityBannedUser.ICreate & {
    banned_at: string & tags.Format<"date-time">;
    unbanned_at?: (string & tags.Format<"date-time">) | null;
    communityId: string & tags.Format<"uuid">;
    userId: string & tags.Format<"uuid">;
    ban_reason: string;
  };
}): Promise<ICommunityPlatformCommunityBannedUser> {
  const { banned_at, unbanned_at, ban_reason, communityId, userId } =
    props.body;
  const bannedAtDate = new Date(banned_at);
  const unbannedAtDate = unbanned_at ? new Date(unbanned_at) : null;
  const createBody = {
    ban_reason,
    banned_at: bannedAtDate,
    unbanned_at: unbannedAtDate,
    communityId,
    userId,
  };
  const data = await CommunityPlatformCommunityBannedUserCollector.collect({
    body: createBody,
  });
  const prismaData = {
    ...data,
    banned_at: toISOStringSafe(data.banned_at),
    unbanned_at: data.unbanned_at ? toISOStringSafe(data.unbanned_at) : null,
  };
  try {
    const created =
      await MyGlobal.prisma.community_platform_community_banned_users.create({
        data: prismaData,
      });
    return created;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("User is already banned in this community", 409);
    }
    throw error;
  }
}
