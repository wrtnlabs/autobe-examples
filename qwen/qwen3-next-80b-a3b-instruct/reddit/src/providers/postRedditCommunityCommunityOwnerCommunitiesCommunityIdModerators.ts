import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityModeratorCollector } from "../collectors/RedditCommunityCommunityModeratorCollector";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityCommunityOwnerCommunitiesCommunityIdModerators(props: {
  communityOwner: CommunityownerPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModerator.ICreate;
}): Promise<IRedditCommunityCommunityModerator> {
  // Validate community ownership
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { owner_user_id: true },
    });
  if (community.owner_user_id !== props.communityOwner.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate target user exists and is not already a moderator
  const targetUser =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: { id: props.body.userId },
    });
  const existingModerator =
    await MyGlobal.prisma.reddit_community_moderators.findUnique({
      where: {
        user_id_community_id: {
          user_id: props.body.userId,
          community_id: props.communityId,
        },
      },
    });
  if (existingModerator) {
    throw new HttpException(
      "User is already a moderator of this community",
      409,
    );
  }
  // Block self-assignment: owner cannot assign themselves as moderator
  if (props.body.userId === props.communityOwner.id) {
    throw new HttpException(
      "Community owner cannot assign themselves as moderator",
      400,
    );
  }
  // Use collector to generate create input for reddit_community_moderators
  const createInput = await RedditCommunityCommunityModeratorCollector.collect({
    body: props.body,
    redditCommunityCommunities: { id: props.communityId },
  });
  // Create the moderator assignment in reddit_community_moderators
  const created = await MyGlobal.prisma.reddit_community_moderators.create({
    data: createInput,
  });
  // Query the created moderator record and join with community and user details
  const result =
    await MyGlobal.prisma.reddit_community_moderators.findUniqueOrThrow({
      where: { id: created.id },
      select: {
        id: true,
        user_id: true,
        community_id: true,
        created_at: true,
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            created_at: true,
            updated_at: true,
            subscribers: { select: { id: true } },
          },
        },
      },
    });
  // Manually construct the response since the transformer expects reddit_community_community_moderators
  // But we only have reddit_community_moderators with related joins
  return {
    id: result.id,
    username: result.user.username,
    display_name: result.user.display_name,
    bio: result.user.bio ?? undefined,
    avatar_url: result.user.avatar_url ?? undefined,
    karma_score: Number(result.user.karma_score),
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.user.created_at),
    community_id: result.community_id,
    email: "",
    user: {
      id: result.user.id,
      username: result.user.username,
      display_name: result.user.display_name,
      bio: result.user.bio ?? undefined,
      avatar_url: result.user.avatar_url ?? undefined,
      karma_score: Number(result.user.karma_score),
      created_at: toISOStringSafe(result.user.created_at),
    },
    community: {
      id: result.community.id,
      name: result.community.name,
      description: result.community.description,
      icon_url: result.community.icon_url ?? null,
      subscriber_count: result.community.subscribers.length,
      created_at: toISOStringSafe(result.community.created_at),
      updated_at: toISOStringSafe(result.community.updated_at),
    },
  } satisfies IRedditCommunityCommunityModerator;
}
