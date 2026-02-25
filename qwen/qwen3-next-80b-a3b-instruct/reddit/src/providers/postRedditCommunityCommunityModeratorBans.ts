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
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityBanTransformer } from "../transformers/RedditCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityCommunityModeratorBans(props: {
  communityModerator: CommunitymoderatorPayload;
  body: IRedditCommunityBan.ICreate;
}): Promise<IRedditCommunityBan> {
  const { communityModerator: cm, body } = props;
  // Validate: user_id is a valid member (not owner, moderator, or admin)
  const user = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { id: body.user_id },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Fetch the community the moderator belongs to
  const moderator =
    await MyGlobal.prisma.reddit_community_moderators.findUnique({
      where: { id: cm.id },
      include: { community: true },
    });
  if (!moderator) {
    throw new HttpException(
      "Moderator not found or not assigned to a community",
      403,
    );
  }
  const communityId = moderator.community_id; // Extract community_id from resolved relation
  // Validate: not already banned
  const existingBan = await MyGlobal.prisma.reddit_community_bans.findFirst({
    where: {
      user_id: body.user_id,
      community_id: communityId,
      is_active: true,
    },
  });
  if (existingBan) {
    throw new HttpException("User already banned in this community", 409);
  }
  // Validate: reason is 1-1000 characters (enforced by DTO, but double-check)
  if (body.reason.length < 1 || body.reason.length > 1000) {
    throw new HttpException("Reason must be 1-1000 characters", 400);
  }
  // Create ban using collector — pass all required entities
  const created = await MyGlobal.prisma.reddit_community_bans.create({
    data: await RedditCommunityBanCollector.collect({
      body,
      redditCommunityCommunities: { id: communityId },
      redditCommunityMembers: { id: body.user_id },
      redditCommunityCommunityModerators: { id: cm.id },
      redditCommunityCommunityOwners: { id: cm.id }, // Fallback to moderator as owner since owners can also ban
    }),
    ...RedditCommunityBanTransformer.select(),
  });
  // Return transformed result
  return await RedditCommunityBanTransformer.transform(created);
}
