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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminCommunitiesCommunityIdModerators(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.ICreate;
}): Promise<ICommunityPlatformCommunityModerator> {
  // 1. Authorization is handled by presence of admin payload
  const { admin, communityId, body } = props;

  // 2. Validate the target community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: communityId,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // 3. Validate the target user exists and is not soft-deleted
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      id: body.user_id,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // 4. Confirm that the user is not already a moderator in this community
  const existing =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_user_id: body.user_id,
        community_platform_community_id: communityId,
      },
    });
  if (existing) {
    throw new HttpException(
      "User is already a moderator for this community",
      409,
    );
  }

  // 5. Create new moderator assignment
  const assignment =
    await MyGlobal.prisma.community_platform_community_moderators.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_user_id: body.user_id,
        community_platform_community_id: communityId,
        assigned_at: toISOStringSafe(new Date()),
      },
    });

  // 6. Compose output DTO using .ISummary for community and user
  return {
    id: assignment.id,
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
    },
    user: {
      id: user.id,
      display_name: user.display_name,
    },
    assigned_at: toISOStringSafe(assignment.assigned_at),
  };
}
