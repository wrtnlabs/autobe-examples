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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformBannedUserTransformer } from "../transformers/CommunityPlatformBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorBannedUsers(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformBannedUser.ICreate;
}): Promise<ICommunityPlatformBannedUser> {
  // Verify that the moderator is assigned to the community via relation
  const modCommunity =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        id: props.moderator.id,
        community: {
          id: props.body.community_platform_community_id,
        },
        deleted_at: null,
      },
    });
  if (!modCommunity) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the user exists
  await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
    where: { id: props.body.community_platform_user_id },
  });
  // Verify the community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.body.community_platform_community_id },
  });
  // Check for active ban
  const activeBan =
    await MyGlobal.prisma.community_platform_banned_users.findFirst({
      where: {
        community_platform_user_id: props.body.community_platform_user_id,
        community_platform_community_id:
          props.body.community_platform_community_id,
        deleted_at: null,
        unbanned_at: null,
      },
    });
  if (activeBan) {
    throw new HttpException("User is already banned in this community", 400);
  }
  // Collect create data using collector
  const createData = await CommunityPlatformBannedUserCollector.collect({
    body: props.body,
  });
  // Create the banned user and return transformed result
  const bannedUser = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.community_platform_banned_users.create({
      data: createData,
    });
    return await tx.community_platform_banned_users.findUniqueOrThrow({
      where: { id: created.id },
      ...CommunityPlatformBannedUserTransformer.select(),
    });
  });
  // Use transformer to convert DB record to DTO with proper date formatting
  return await CommunityPlatformBannedUserTransformer.transform(bannedUser);
}
