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
import { RedditCommunityBanTransformer } from "../transformers/RedditCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityCommunityOwnerCommunitiesCommunityIdBans(props: {
  communityOwner: CommunityownerPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityBan.ICreate;
}): Promise<IRedditCommunityBan> {
  // Fetch the banned user from any of the four actor tables
  let bannedUser: IEntity | null =
    await MyGlobal.prisma.reddit_community_members.findUnique({
      where: { id: props.body.user_id },
    });
  if (!bannedUser) {
    bannedUser =
      await MyGlobal.prisma.reddit_community_community_moderators.findUnique({
        where: { id: props.body.user_id },
      });
  }
  if (!bannedUser) {
    bannedUser =
      await MyGlobal.prisma.reddit_community_community_owners.findUnique({
        where: { id: props.body.user_id },
      });
  }
  if (!bannedUser) {
    bannedUser =
      await MyGlobal.prisma.reddit_community_platform_admins.findUnique({
        where: { id: props.body.user_id },
      });
  }
  if (!bannedUser) {
    throw new HttpException("User does not exist", 404);
  }
  // Create ban record using collector
  const created = await MyGlobal.prisma.reddit_community_bans.create({
    data: await RedditCommunityBanCollector.collect({
      body: props.body,
      redditCommunityCommunities: { id: props.communityId } as any,
      redditCommunityMembers: bannedUser,
      redditCommunityCommunityModerators: bannedUser as any, // not used but required
      redditCommunityCommunityOwners: bannedUser as any, // not used but required
    }),
    ...RedditCommunityBanTransformer.select(),
  });
  // Return transformed response
  return await RedditCommunityBanTransformer.transform(created);
}
