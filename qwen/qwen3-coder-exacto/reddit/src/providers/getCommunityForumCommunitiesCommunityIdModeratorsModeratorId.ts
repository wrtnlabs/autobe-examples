import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function getCommunityForumCommunitiesCommunityIdModeratorsModeratorId(props: {
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityForumCommunityModerator> {
  // Check if community exists and is active
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: { id: props.communityId },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  if (community.status !== "active") {
    throw new HttpException("Community is not active", 400);
  }

  // Check if moderator exists
  const moderator = await MyGlobal.prisma.community_forum_moderators.findUnique(
    {
      where: { id: props.moderatorId },
    },
  );

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Get the user information for this moderator
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: { id: moderator.community_forum_user_id },
  });

  if (!user) {
    throw new HttpException("Moderator user not found", 404);
  }

  return {
    id: moderator.id,
    community_forum_user_id: moderator.community_forum_user_id,
    user: {
      id: user.id,
      username: user.username,
    },
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
  };
}
