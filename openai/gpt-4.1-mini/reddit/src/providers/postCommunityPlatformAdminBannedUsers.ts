import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformBannedUserCollector } from "../collectors/CommunityPlatformBannedUserCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformBannedUserTransformer } from "../transformers/CommunityPlatformBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminBannedUsers(props: {
  admin: AdminPayload;
  body: ICommunityPlatformBannedUser.ICreate;
}): Promise<ICommunityPlatformBannedUser> {
  const userId: string & tags.Format<"uuid"> =
    props.body.community_platform_user_id;
  const communityId: string & tags.Format<"uuid"> =
    props.body.community_platform_community_id;
  const bannedAt: string & tags.Format<"date-time"> = props.body.banned_at;
  const unbannedAt: (string & tags.Format<"date-time">) | null | undefined =
    props.body.unbanned_at ?? null;
  const reason: string = props.body.reason;
  // Validate user existence
  await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
    where: { id: userId },
  });
  // Validate community existence
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: communityId },
  });
  // Check for existing active ban
  const existingBan =
    await MyGlobal.prisma.community_platform_banned_users.findFirst({
      where: {
        community_platform_user_id: userId,
        community_platform_community_id: communityId,
        deleted_at: null,
        unbanned_at: null,
      },
    });
  if (existingBan) {
    throw new HttpException("User already banned in this community", 409);
  }
  // Use a transaction for atomic creation and retrieval
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await CommunityPlatformBannedUserCollector.collect({
      body: {
        community_platform_user_id: userId,
        community_platform_community_id: communityId,
        banned_at: bannedAt,
        unbanned_at: unbannedAt,
        reason,
      },
    });
    const created = await tx.community_platform_banned_users.create({
      data,
      ...CommunityPlatformBannedUserTransformer.select(),
    });
    return await CommunityPlatformBannedUserTransformer.transform(created);
  });
}
