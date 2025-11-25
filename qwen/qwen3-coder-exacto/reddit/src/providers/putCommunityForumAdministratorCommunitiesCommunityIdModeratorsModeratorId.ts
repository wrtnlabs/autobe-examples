import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityForumAdministratorCommunitiesCommunityIdModeratorsModeratorId(props: {
  administrator: AdministratorPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the community exists and is active
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: {
        id: props.communityId,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  if (community.status !== "active") {
    throw new HttpException("Community is not active", 400);
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

  // Check if the user is already a moderator for this specific community
  // Note: Based on the schema, moderators are linked to users, not directly to communities
  // So we check if the user is already a moderator in general
  const existingModerator =
    await MyGlobal.prisma.community_forum_moderators.findFirst({
      where: {
        community_forum_user_id: props.moderatorId,
      },
    });

  if (existingModerator) {
    throw new HttpException("User is already a moderator", 409);
  }

  // Create the moderator entry
  await MyGlobal.prisma.community_forum_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_forum_user_id: props.moderatorId,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
