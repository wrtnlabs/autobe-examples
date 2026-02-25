import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityBanCollector } from "../collectors/CommunityPlatformCommunityBanCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function ReceiververCommOnCompute(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.ICreate;
}): Promise<ICommunityPlatformCommunityBan> {
  // 1. Verify community exists and get owner info
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_user_id: true },
    });
  // 2. Verify moderator is assigned to this community
  await MyGlobal.prisma.community_platform_community_moderators.findFirstOrThrow(
    {
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
      },
    },
  );
  // 3. Verify target user exists and is not the community owner
  await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
    where: { id: props.body.user_id },
  });
  if (community.owner_user_id === props.body.user_id) {
    throw new HttpException("Cannot ban community owner", 403);
  }
  // 4. Check if target user is a moderator in this community
  const isModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.body.user_id,
      },
    });
  if (isModerator !== null) {
    throw new HttpException(
      "Cannot ban moderator from their own community",
      403,
    );
  }
  // 5. Check for existing active ban
  const existingBan =
    await MyGlobal.prisma.community_platform_community_bans.findUnique({
      where: {
        community_id_user_id: {
          community_id: props.communityId,
          user_id: props.body.user_id,
        },
      },
    });
  if (existingBan && existingBan.status === "active") {
    throw new HttpException("User is already banned from this community", 409);
  }
  // 6. Validate expiration date if provided
  if (props.body.expires_at) {
    const expiresAt = new Date(props.body.expires_at);
    if (expiresAt <= new Date()) {
      throw new HttpException("Expiration date must be in the future", 400);
    }
  }
  // 7. Create ban using collector
  const ban = await MyGlobal.prisma.community_platform_community_bans.create({
    data: await CommunityPlatformCommunityBanCollector.collect({
      body: props.body,
      communityPlatformCommunities: { id: props.communityId },
      communityPlatformModerators: { id: props.moderator.id },
      communityPlatformModeratorSessions: { id: props.moderator.session_id },
    }),
    ...CommunityPlatformCommunityBanTransformer.select(),
  });
  // 8. Transform and return
  return await CommunityPlatformCommunityBanTransformer.transform(ban);
}
// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformModeratorCommunitiesCommunityIdBans(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.ICreate;
}): Promise<ICommunityPlatformCommunityBan> {
  // 1. Verify community exists and get owner info
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_user_id: true },
    });
  // 2. Verify moderator is assigned to this community
  await MyGlobal.prisma.community_platform_community_moderators.findFirstOrThrow(
    {
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
      },
    },
  );
  // 3. Verify target user exists and is not the community owner
  const targetUser =
    await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
      where: { id: props.body.user_id },
    });
  if (community.owner_user_id === props.body.user_id) {
    throw new HttpException("Cannot ban community owner", 403);
  }
  // 4. Check if target user is a moderator in this community
  const isModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.body.user_id,
      },
    });
  if (isModerator !== null) {
    throw new HttpException(
      "Cannot ban moderator from their own community",
      403,
    );
  }
  // 5. Check for existing active ban
  const existingBan =
    await MyGlobal.prisma.community_platform_community_bans.findUnique({
      where: {
        community_id_user_id: {
          community_id: props.communityId,
          user_id: props.body.user_id,
        },
      },
    });
  if (existingBan && existingBan.status === "active") {
    throw new HttpException("User is already banned from this community", 409);
  }
  // 6. Validate expiration date if provided (string to Date)
  if (props.body.expires_at) {
    const expiresAt = new Date(props.body.expires_at);
    if (expiresAt <= new Date()) {
      throw new HttpException("Expiration date must be in the future", 400);
    }
  }
  // 7. Create ban using collector
  const ban = await MyGlobal.prisma.community_platform_community_bans.create({
    data: await CommunityPlatformCommunityBanCollector.collect({
      body: props.body,
      communityPlatformCommunities: { id: props.communityId },
      communityPlatformModerators: { id: props.moderator.id },
      communityPlatformModeratorSessions: { id: props.moderator.session_id },
    }),
    ...CommunityPlatformCommunityBanTransformer.select(),
  });
  // 8. Transform and return
  return await CommunityPlatformCommunityBanTransformer.transform(ban);
}
