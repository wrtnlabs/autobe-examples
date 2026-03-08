import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityBanCollector } from "../collectors/RedditPlatformCommunityBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityBanTransformer } from "../transformers/RedditPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityBan.ICreate;
}): Promise<IRedditPlatformCommunityBan> {
  // Step 1: Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  // Step 2: Check if the current member is the owner or has moderator privileges
  const isOwner = community.owner_id === props.member.id;
  if (!isOwner) {
    // Check if member is a moderator of this community
    const moderator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          community_id: props.communityId,
          user_id: props.member.id,
        },
      });
    if (moderator === null) {
      throw new HttpException(
        "You do not have permission to ban users in this community",
        403,
      );
    }
  }
  // Step 3: Verify target user exists
  const targetUser = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: {
      id: props.body.user_id,
      deleted_at: null,
    },
  });
  if (targetUser === null) {
    throw new HttpException("Target user not found", 404);
  }
  // Step 4: Check for existing active ban to prevent duplicates
  const existingBan =
    await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.body.user_id,
        deleted_at: null,
      },
    });
  if (existingBan !== null) {
    throw new HttpException("User is already banned from this community", 409);
  }
  // Step 5: Create the ban record using collector
  const created = await MyGlobal.prisma.reddit_platform_community_bans.create({
    data: await RedditPlatformCommunityBanCollector.collect({
      body: props.body,
      redditPlatformCommunities: {
        id: props.communityId,
      },
      redditPlatformMembers: {
        id: props.member.id,
      },
    }),
    ...RedditPlatformCommunityBanTransformer.select(),
  });
  // Step 6: Return transformed response
  return await RedditPlatformCommunityBanTransformer.transform(created);
}
