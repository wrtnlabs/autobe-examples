import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformBannedUserCollector } from "../collectors/CommunityPlatformBannedUserCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorBannedUsers(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformBannedUser.ICreate;
}): Promise<ICommunityPlatformBannedUser> {
  const bodyAny = props.body as any;
  const userId = bodyAny.community_platform_user_id ?? bodyAny.user_id ?? null;
  const communityId =
    bodyAny.community_platform_community_id ?? bodyAny.community_id ?? null;
  if (userId == null) {
    throw new HttpException("User ID is missing in request body", 400);
  }
  if (communityId == null) {
    throw new HttpException("Community ID is missing in request body", 400);
  }
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const existingBan =
    await MyGlobal.prisma.community_platform_banned_users.findUnique({
      where: {
        community_platform_user_id_community_platform_community_id: {
          community_platform_user_id: userId,
          community_platform_community_id: communityId,
        },
      },
      select: { id: true },
    });
  if (existingBan) {
    throw new HttpException("Ban record already exists", 409);
  }
  const createData = await CommunityPlatformBannedUserCollector.collect({
    body: props.body,
    user: { id: userId },
    community: { id: communityId },
  });
  const created = await MyGlobal.prisma.community_platform_banned_users.create({
    data: createData,
  });
  return created;
}
