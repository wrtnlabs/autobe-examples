import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityBanCollector } from "../collectors/RedditCommunityBanCollector";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditCommunityCommunityOwnerBans(props: {
  communityOwner: CommunityownerPayload;
  body: IRedditCommunityBan.ICreate;
}): Promise<IRedditCommunityCommunity> {
  const { communityOwner, body } = props;
  // Validate user_id exists in one of the actor tables
  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: { id: body.user_id },
  });
  const owner =
    await MyGlobal.prisma.reddit_community_community_owners.findFirst({
      where: { id: body.user_id },
    });
  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: { id: body.user_id },
    });
  const platformAdmin =
    await MyGlobal.prisma.reddit_community_platform_admins.findFirst({
      where: { id: body.user_id },
    });
  if (!member && !owner && !moderator && !platformAdmin) {
    throw new HttpException("User not found", 404);
  }
  // Find the community owned by the authenticated communityOwner
  const ownedCommunity =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { owner_user_id: communityOwner.id },
    });
  // Verify user is not already banned in this community
  const existingBan = await MyGlobal.prisma.reddit_community_bans.findFirst({
    where: {
      user_id: body.user_id,
      community_id: ownedCommunity.id,
      is_active: true,
    },
  });
  if (existingBan) {
    throw new HttpException("User is already banned in this community", 409);
  }
  // Validate reason length
  if (!body.reason || body.reason.length < 1 || body.reason.length > 1000) {
    throw new HttpException("Reason must be 1-1000 characters", 400);
  }
  // Use collector to construct CreateInput with the owned community as the target
  const actor = member || owner || moderator;
  // Ensure actor is defined and cast as IEntity
  if (!actor) {
    throw new HttpException("Actor not found", 404);
  }
  const createdBan = await MyGlobal.prisma.reddit_community_bans.create({
    data: await RedditCommunityBanCollector.collect({
      body,
      redditCommunityCommunities: ownedCommunity,
      redditCommunityMembers: actor === member ? actor : null,
      redditCommunityCommunityModerators: actor === moderator ? actor : null,
      redditCommunityCommunityOwners: actor === owner ? actor : null,
    }),
  });
  // Return the community that this ban belongs to, using community transformer
  return await RedditCommunityCommunityTransformer.transform(
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: createdBan.community_id },
    }),
  );
}
