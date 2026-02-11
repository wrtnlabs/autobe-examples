import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityTransformer } from "../transformers/RedditPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string;
}): Promise<IRedditPlatformCommunity> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.communityId },
      ...RedditPlatformCommunityTransformer.select(),
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Check if user is owner or admin
  if (
    community.owner?.id !== props.member.id &&
    typia.assert<string>(props.member.type) !== "admin"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete subscriptions
  await MyGlobal.prisma.reddit_platform_subscriptions.deleteMany({
    where: { community_id: props.communityId },
  });
  // Delete posts (this will cascade to votes, comments)
  await MyGlobal.prisma.reddit_platform_posts.deleteMany({
    where: { community_id: props.communityId },
  });
  // Delete moderations
  await MyGlobal.prisma.reddit_platform_moderations.deleteMany({
    where: { community_id: props.communityId },
  });
  // Delete the community
  const deletedCommunity =
    await MyGlobal.prisma.reddit_platform_communities.delete({
      where: { id: props.communityId },
      ...RedditPlatformCommunityTransformer.select(),
    });
  return await RedditPlatformCommunityTransformer.transform(deletedCommunity);
}
