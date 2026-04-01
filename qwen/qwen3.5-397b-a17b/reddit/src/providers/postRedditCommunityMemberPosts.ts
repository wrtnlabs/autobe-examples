import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostCollector } from "../collectors/RedditCommunityPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPosts(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.ICreate;
}): Promise<IRedditCommunityPost> {
  // Verify community exists
  await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
    where: { id: props.body.communityId },
  });
  // Verify member has active subscription to the community
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.body.communityId,
      },
    });
  if (!subscription) {
    throw new HttpException("Not subscribed to community", 403);
  }
  // Create post using collector
  const created = await MyGlobal.prisma.reddit_community_posts.create({
    data: await RedditCommunityPostCollector.collect({
      body: props.body,
      redditCommunityMembers: { id: props.member.id },
    }),
    ...RedditCommunityPostTransformer.select(),
  });
  // Transform and return
  return await RedditCommunityPostTransformer.transform(created);
}
