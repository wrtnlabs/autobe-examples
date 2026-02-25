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
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityCommunityModeratorCommunitiesCommunityIdModerators(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModerator.ICreate;
}): Promise<IRedditCommunityCommunity> {
  // Validate that actor has permission to assign moderators
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        owner_user_id: true,
        moderators: {
          select: { user_id: true },
        },
      },
    });
  const isOwner = community.owner_user_id === props.communityModerator.id;
  const isExistingModerator = community.moderators.some(
    (m) => m.user_id === props.communityModerator.id,
  );
  if (!isOwner && !isExistingModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate target user exists as a member
  const targetUser =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: { id: props.body.userId },
    });
  // Validate target user is not already a moderator
  const existingModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        user_id: props.body.userId,
        community_id: props.communityId,
      },
    });
  if (existingModerator !== null) {
    throw new HttpException("User is already a moderator", 409);
  }
  // Create moderator assignment using collector
  const assignment = await MyGlobal.prisma.reddit_community_moderators.create({
    data: await RedditCommunityCommunityModeratorCollector.collect({
      body: props.body,
      redditCommunityCommunities: { id: props.communityId },
    }),
  });
  // Return updated community with full details using transformer
  const updatedCommunity =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditCommunityCommunityTransformer.select(),
    });
  return await RedditCommunityCommunityTransformer.transform(updatedCommunity);
}
