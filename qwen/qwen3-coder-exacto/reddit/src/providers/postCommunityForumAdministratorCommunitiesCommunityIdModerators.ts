import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postCommunityForumAdministratorCommunitiesCommunityIdModerators(props: {
  administrator: AdministratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityForumCommunityModerator.ICreate;
}): Promise<ICommunityForumCommunityModerator> {
  // Check if the community exists
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: {
        id: props.communityId,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Check if the user exists
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: {
      id: props.body.community_forum_user_id,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Check if the user is already a moderator
  const existingModerator =
    await MyGlobal.prisma.community_forum_moderators.findFirst({
      where: {
        community_forum_user_id: props.body.community_forum_user_id,
      },
    });

  if (existingModerator) {
    throw new HttpException("User is already a moderator", 409);
  }

  // Create the new moderator record
  const created = await MyGlobal.prisma.community_forum_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_forum_user_id: props.body.community_forum_user_id,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });

  // Return the created moderator with user information
  return {
    id: created.id,
    community_forum_user_id: created.community_forum_user_id,
    user: {
      id: user.id,
      username: user.username,
    },
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
  };
}
