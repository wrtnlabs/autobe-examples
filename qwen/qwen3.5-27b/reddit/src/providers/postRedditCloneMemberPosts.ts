import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostCollector } from "../collectors/RedditClonePostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostTransformer } from "../transformers/RedditClonePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPosts(props: {
  member: MemberPayload;
  body: IRedditClonePost.ICreate;
}): Promise<IRedditClonePost> {
  // Get the member's user profile
  const userProfile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
      where: {
        reddit_clone_member_id: props.member.id,
      },
    });
  // Verify community exists and is not deleted
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { id: props.body.community_id },
    select: { id: true, deleted_at: true },
  });
  if (community === null || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // Verify member is subscribed to the community
  const subscription =
    await MyGlobal.prisma.reddit_clone_community_subscriptions.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_community_id: props.body.community_id,
        deleted_at: null,
      },
    });
  if (subscription === null) {
    throw new HttpException("Not subscribed to community", 403);
  }
  // Create the post using Collector and Transformer
  const record = await MyGlobal.prisma.reddit_clone_posts.create({
    data: await RedditClonePostCollector.collect({
      body: props.body,
      redditCloneUserProfiles: userProfile,
    }),
    ...RedditClonePostTransformer.select(),
  });
  return await RedditClonePostTransformer.transform(record);
}
