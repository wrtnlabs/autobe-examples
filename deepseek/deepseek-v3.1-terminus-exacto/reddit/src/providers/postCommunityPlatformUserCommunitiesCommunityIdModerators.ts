import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityModeratorCollector } from "../collectors/CommunityPlatformCommunityModeratorCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserCommunitiesCommunityIdModerators(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.ICreate;
}): Promise<ICommunityPlatformCommunityModerator> {
  // Verify the community exists and get ownership info
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        owner_user_id: true,
        moderators: {
          where: {
            user_id: props.user.id,
            is_active: true,
            deleted_at: null,
          },
          select: { id: true },
        },
      },
    });
  // Authorization check: must be owner or existing moderator
  const isOwner = community.owner_user_id === props.user.id;
  const isModerator = community.moderators.length > 0;
  if (!isOwner && !isModerator) {
    throw new HttpException(
      "You must be the community owner or a moderator to add moderators",
      403,
    );
  }
  // Verify target user exists
  await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
    where: { id: props.body.user_id },
  });
  // Check if user is already a moderator in this community
  const existingModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.body.user_id,
        community_id: props.communityId,
        is_active: true,
        deleted_at: null,
      },
    });
  if (existingModerator) {
    throw new HttpException(
      "User is already a moderator in this community",
      400,
    );
  }
  // Create the moderator assignment using the collector
  const moderatorData =
    await CommunityPlatformCommunityModeratorCollector.collect({
      body: props.body,
      communityPlatformCommunities: { id: props.communityId },
      communityPlatformUsers: { id: props.user.id },
    });
  const createdModerator =
    await MyGlobal.prisma.community_platform_community_moderators.create({
      data: moderatorData,
      ...CommunityPlatformCommunityModeratorTransformer.select(),
    });
  return await CommunityPlatformCommunityModeratorTransformer.transform(
    createdModerator,
  );
}
