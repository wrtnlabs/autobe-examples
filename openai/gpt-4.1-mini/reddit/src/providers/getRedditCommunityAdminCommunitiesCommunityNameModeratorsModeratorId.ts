import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminCommunitiesCommunityNameModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityModerator> {
  const { communityName, moderatorId } = props;

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        id: moderatorId,
        community: { name: communityName },
      },
      include: {
        community: true,
        moderator: true,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException("Community moderator not found", 404);
  }

  return {
    id: moderatorAssignment.id,
    reddit_community_community_id:
      moderatorAssignment.reddit_community_community_id,
    reddit_community_moderator_id:
      moderatorAssignment.reddit_community_moderator_id,
    assigned_at: toISOStringSafe(moderatorAssignment.assigned_at),

    community: {
      id: moderatorAssignment.community.id,
      name: moderatorAssignment.community.name,
      description: moderatorAssignment.community.description ?? null,
      created_at: toISOStringSafe(moderatorAssignment.community.created_at),
      updated_at: toISOStringSafe(moderatorAssignment.community.updated_at),
    },

    moderator: {
      id: moderatorAssignment.moderator.id,
      user_id: moderatorAssignment.moderator.user_id,
      created_at: toISOStringSafe(moderatorAssignment.moderator.created_at),
    },
  };
}
