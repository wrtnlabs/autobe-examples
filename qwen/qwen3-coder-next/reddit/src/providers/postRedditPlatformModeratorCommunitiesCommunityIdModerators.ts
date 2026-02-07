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

export async function postRedditPlatformModeratorCommunitiesCommunityIdModerators(props: {
  moderator: ModeratorPayload;
  communityId: string;
  body: IRedditPlatformCommunityRole.ICreate;
}): Promise<IRedditPlatformCommunityRole> {
  // Verify communityId format is valid UUID
  if (
    !props.communityId.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  ) {
    throw new HttpException("Invalid community ID format", 400);
  }
  // Verify community exists and retrieve its details
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify the authenticated user is the community owner
  if (community.owner_id !== props.moderator.id) {
    throw new HttpException("Forbidden: You are not the community owner", 403);
  }
  // Create new moderator role assignment with fixed data structure
  const created = await MyGlobal.prisma.reddit_platform_community_roles.create({
    data: {
      id: v4(),
      user_id: props.moderator.id, // Using moderator as the target user since body is empty
      community_id: props.communityId,
      role: "moderator", // Default role as specified in operation
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  // Return the created record with proper type casting
  return {
    id: created.id,
    user_id: created.user_id,
    community_id: created.community_id,
    role: created.role,
    created_at: created.created_at.toISOString(),
    updated_at: created.updated_at.toISOString(),
  };
}
