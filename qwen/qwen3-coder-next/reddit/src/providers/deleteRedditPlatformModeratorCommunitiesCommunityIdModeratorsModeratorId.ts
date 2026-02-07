import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRole";
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

export async function deleteRedditPlatformModeratorCommunitiesCommunityIdModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  communityId: string;
  moderatorId: string;
}): Promise<IRedditPlatformCommunityRole> {
  // Find the community to verify the requesting moderator is the owner
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify that the requesting moderator is the community owner
  if (community.owner_id !== props.moderator.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the specific role assignment
  const role = await MyGlobal.prisma.reddit_platform_community_roles.findFirst({
    where: {
      community_id: props.communityId,
      user_id: props.moderatorId,
    },
  });
  if (!role) {
    throw new HttpException("Moderator role not found", 404);
  }
  // Delete the role assignment
  await MyGlobal.prisma.reddit_platform_community_roles.delete({
    where: { id: role.id },
  });
  // Return the deleted role information
  return {
    id: role.id,
    user_id: role.user_id,
    community_id: role.community_id,
    role: role.role,
    created_at: toISOStringSafe(role.created_at),
    updated_at: toISOStringSafe(role.updated_at),
  };
}
