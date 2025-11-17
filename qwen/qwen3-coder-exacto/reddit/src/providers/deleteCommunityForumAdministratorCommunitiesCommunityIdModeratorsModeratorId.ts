import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityForumAdministratorCommunitiesCommunityIdModeratorsModeratorId(props: {
  administrator: AdministratorPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the community exists and is active
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: {
        id: props.communityId,
        deleted_at: null,
        status: "active",
      },
    });

  if (!community) {
    throw new HttpException("Community not found or not active", 404);
  }

  // Check if the user exists
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: {
      id: props.moderatorId,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Check if the user is actually a moderator
  // The schema shows community_forum_moderators has community_forum_user_id as a unique field
  // which suggests each user can be a moderator, but doesn't specify which community
  const moderator = await MyGlobal.prisma.community_forum_moderators.findUnique(
    {
      where: {
        community_forum_user_id: props.moderatorId,
      },
    },
  );

  if (!moderator) {
    throw new HttpException("User is not a moderator", 404);
  }

  // Remove the moderator relationship
  await MyGlobal.prisma.community_forum_moderators.delete({
    where: {
      id: moderator.id,
    },
  });
}
