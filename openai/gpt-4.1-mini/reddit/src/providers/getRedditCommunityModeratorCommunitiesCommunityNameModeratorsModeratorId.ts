import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorCommunitiesCommunityNameModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  communityName: string;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityModerator> {
  const { communityName, moderatorId } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const communityModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        id: moderatorId,
        reddit_community_community_id: community.id,
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        moderator: {
          select: {
            id: true,
            user_id: true,
            created_at: true,
          },
        },
      },
    });

  if (!communityModerator) {
    throw new HttpException("Moderator not found in community", 404);
  }

  return {
    id: communityModerator.id,
    reddit_community_community_id:
      communityModerator.reddit_community_community_id,
    reddit_community_moderator_id:
      communityModerator.reddit_community_moderator_id,
    assigned_at: toISOStringSafe(communityModerator.assigned_at),
    community: {
      id: communityModerator.community.id,
      name: communityModerator.community.name,
      description: communityModerator.community.description ?? null,
      created_at: toISOStringSafe(communityModerator.community.created_at),
      updated_at: toISOStringSafe(communityModerator.community.updated_at),
    },
    moderator: {
      id: communityModerator.moderator.id,
      user_id: communityModerator.moderator.user_id,
      created_at: toISOStringSafe(communityModerator.moderator.created_at),
    },
  };
}
