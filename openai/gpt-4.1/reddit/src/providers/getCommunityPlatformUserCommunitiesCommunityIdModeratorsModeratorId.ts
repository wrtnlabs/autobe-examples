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

export async function getCommunityPlatformUserCommunitiesCommunityIdModeratorsModeratorId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModerator> {
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: { id: props.moderatorId },
      include: {
        user: true,
        community: true,
      },
    });
  if (
    !moderator ||
    moderator.community_platform_community_id !== props.communityId
  ) {
    throw new HttpException("Moderator assignment not found", 404);
  }
  return {
    id: moderator.id,
    community: {
      id: moderator.community.id,
      name: moderator.community.name,
      description: moderator.community.description,
    },
    user: {
      id: moderator.user.id,
      display_name: moderator.user.display_name,
    },
    assigned_at: toISOStringSafe(moderator.assigned_at),
  };
}
