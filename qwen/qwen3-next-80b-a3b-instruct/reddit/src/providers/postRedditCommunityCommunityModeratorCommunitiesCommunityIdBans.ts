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

export async function postRedditCommunityCommunityModeratorCommunitiesCommunityIdBans(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityBan.ICreate;
}): Promise<IRedditCommunityBan> {
  // Validate community exists
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // Validate the actor is a moderator of this community
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        community_id: props.communityId,
        user_id: props.communityModerator.id,
      },
    },
  );
  if (!moderator) {
    throw new HttpException(
      "Forbidden: Not a moderator of this community",
      403,
    );
  }
  // Find the target user among all actor tables
  const user = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { id: props.body.user_id },
  });
  const moderatorUser =
    await MyGlobal.prisma.reddit_community_community_moderators.findUnique({
      where: { id: props.body.user_id },
    });
  const owner =
    await MyGlobal.prisma.reddit_community_community_owners.findUnique({
      where: { id: props.body.user_id },
    });
  const admin =
    await MyGlobal.prisma.reddit_community_platform_admins.findUnique({
      where: { id: props.body.user_id },
    });
  if (!user && !moderatorUser && !owner && !admin) {
    throw new HttpException("User not found", 404);
  }
  // Validate user is not already banned in this community
  const existingBan = await MyGlobal.prisma.reddit_community_bans.findUnique({
    where: {
      user_id_community_id: {
        user_id: props.body.user_id,
        community_id: props.communityId,
      },
    },
  });
  if (existingBan && existingBan.is_active) {
    throw new HttpException("User is already banned in this community", 409);
  }
  // Create ban record using collector
  const created = await MyGlobal.prisma.reddit_community_bans.create({
    data: await RedditCommunityBanCollector.collect({
      body: props.body,
      redditCommunityCommunities: community,
      redditCommunityMembers: user ?? ({} as IEntity),
      redditCommunityCommunityModerators: moderatorUser ?? ({} as IEntity),
      redditCommunityCommunityOwners: owner ?? ({} as IEntity),
    }),
    ...RedditCommunityBanTransformer.select(),
  });
  // Transform and return
  return await RedditCommunityBanTransformer.transform(created);
}
