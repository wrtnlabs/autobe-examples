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

export async function patchRedditPlatformModeratorCommunitiesCommunityIdModerators(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityRole.ICreate;
}): Promise<IRedditPlatformCommunityRole> {
  // Fetch the community to verify it exists and get its owner_id
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Validate that the requester is the community owner
  if (community.owner_id !== props.moderator.id) {
    throw new HttpException(
      "Forbidden: You must be the community owner to add moderators",
      403,
    );
  }
  // Check for existing role assignment
  const existingRole =
    await MyGlobal.prisma.reddit_platform_community_roles.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: props.communityId,
      },
    });
  if (existingRole) {
    throw new HttpException(
      "User is already assigned as a moderator for this community",
      409,
    );
  }
  // Create the moderator role assignment
  const createdRole =
    await MyGlobal.prisma.reddit_platform_community_roles.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: props.moderator.id,
        community_id: props.communityId,
        role: "moderator",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        user_id: true,
        community_id: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Log the action in moderation_logs table with correct field names
  await MyGlobal.prisma.reddit_platform_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderator_id: props.moderator.id,
      community_id: props.communityId,
      action_type: "add_moderator",
      action_description: `Added user ${props.moderator.id} as moderator to community ${props.communityId}`,
      context: "Community moderator assignment",
      executed_at: toISOStringSafe(new Date()),
      reversible: true,
      auto_moderated: false,
    },
  });
  return {
    id: createdRole.id,
    user_id: createdRole.user_id,
    community_id: createdRole.community_id,
    role: createdRole.role,
    created_at: createdRole.created_at,
    updated_at: createdRole.updated_at,
  };
}
