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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdModerators(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.ICreate;
}): Promise<ICommunityPlatformCommunityModerator> {
  // Verify community exists and get owner information
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
      select: { id: true, owner_user_id: true },
    });
  // Verify target user exists
  const targetUser =
    await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
      where: { id: props.body.user_id, deleted_at: null },
      select: { id: true },
    });
  // Check if user is already a moderator in this community
  const existingModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.body.user_id,
        community_id: props.communityId,
        deleted_at: null,
        is_active: true,
      },
    });
  if (existingModerator) {
    throw new HttpException(
      "User is already a moderator in this community",
      400,
    );
  }
  // Validate role_level is not empty
  if (!props.body.role_level || props.body.role_level.trim().length === 0) {
    throw new HttpException("Role level is required", 400);
  }
  // Create moderator assignment using collector
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.create({
      data: await CommunityPlatformCommunityModeratorCollector.collect({
        body: props.body,
        communityPlatformCommunities: { id: props.communityId },
        communityPlatformUsers: { id: props.admin.id },
      }),
      ...CommunityPlatformCommunityModeratorTransformer.select(),
    });
  // Transform and return response
  return await CommunityPlatformCommunityModeratorTransformer.transform(
    moderator,
  );
}
