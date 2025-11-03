import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserCommunitiesCommunityIdModerators(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.ICreate;
}): Promise<ICommunityPlatformCommunityModerator> {
  // 1. Check community exists (and not soft-deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: props.communityId, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
  if (!community) throw new HttpException("Community not found", 404);

  // 2. Check acting user is a moderator for this community
  const isModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: {
        community_platform_user_id_community_platform_community_id: {
          community_platform_user_id: props.user.id,
          community_platform_community_id: props.communityId,
        },
      },
    });
  if (!isModerator)
    throw new HttpException(
      "Forbidden: Only community moderators can assign new moderators",
      403,
    );

  // 3. Check target user exists and is not deleted
  const userRecord = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { id: props.body.user_id, deleted_at: null },
    select: { id: true, display_name: true },
  });
  if (!userRecord)
    throw new HttpException("Target user not found or deleted", 404);

  // 4. Check if user is already moderator for this community
  const alreadyModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: {
        community_platform_user_id_community_platform_community_id: {
          community_platform_user_id: props.body.user_id,
          community_platform_community_id: props.communityId,
        },
      },
    });
  if (alreadyModerator)
    throw new HttpException(
      "User is already a moderator for this community",
      409,
    );

  // 5. Assign moderator
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_community_moderators.create({
      data: {
        id: v4(),
        community_platform_user_id: props.body.user_id,
        community_platform_community_id: props.communityId,
        assigned_at: now,
      },
    });

  // 6. Build and return ICommunityPlatformCommunityModerator
  return {
    id: created.id,
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
    },
    user: {
      id: userRecord.id,
      display_name: userRecord.display_name,
    },
    assigned_at: now,
  };
}
