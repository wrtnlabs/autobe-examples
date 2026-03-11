import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityModeratorCollector } from "../collectors/RedditPlatformCommunityModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityModeratorTransformer } from "../transformers/RedditPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityModerator.ICreate;
}): Promise<IRedditPlatformCommunityModerator> {
  // Step 1: Verify community exists
  await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Step 2: Check requesting user's role in this community
  const communityMemberRole =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
      },
      select: { id: true },
    });
  // Get community owner to check if requester is owner
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { owner_id: true },
    });
  // Verify requester is owner or existing moderator
  if (community.owner_id !== props.member.id && !communityMemberRole) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate target user exists
  await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
    where: { id: props.body.user_id },
  });
  // Step 4: Check if user already has moderator status
  const existingModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.body.user_id,
      },
      select: { id: true },
    });
  if (existingModerator) {
    throw new HttpException("User is already a moderator", 409);
  }
  // Step 5: Create moderator assignment
  const created =
    await MyGlobal.prisma.reddit_platform_community_moderators.create({
      data: await RedditPlatformCommunityModeratorCollector.collect({
        body: props.body,
        redditPlatformCommunities: {
          id: props.communityId,
        },
      }),
      ...RedditPlatformCommunityModeratorTransformer.select(),
    });
  // Step 6: Return transformed response
  return await RedditPlatformCommunityModeratorTransformer.transform(created);
}
