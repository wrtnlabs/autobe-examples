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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformCommunityModeratorTransformer } from "../transformers/RedditPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAdminCommunitiesCommunityIdModerators(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityModerator.ICreate;
}): Promise<IRedditPlatformCommunityModerator> {
  // Step 1: Verify community exists and get owner_id
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_id: true },
    });
  // Step 2: Verify admin has authority (owner or moderator) in this community
  const isOwner = community.owner_id === props.admin.id;
  const isModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.admin.id,
      },
    });
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate target user exists
  const targetUser =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.body.user_id },
    });
  // Step 4: Check if user is already a moderator in this community
  const existingModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.body.user_id,
      },
    });
  if (existingModerator) {
    throw new HttpException("User is already a moderator", 409);
  }
  // Step 5: Create moderator assignment using collector
  const moderatorCollector =
    await RedditPlatformCommunityModeratorCollector.collect({
      body: props.body,
      redditPlatformCommunities: { id: props.communityId } as IEntity,
    });
  const created =
    await MyGlobal.prisma.reddit_platform_community_moderators.create({
      data: moderatorCollector,
      ...RedditPlatformCommunityModeratorTransformer.select(),
    });
  // Step 6: Transform and return
  return await RedditPlatformCommunityModeratorTransformer.transform(created);
}
