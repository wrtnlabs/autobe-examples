import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostCollector } from "../collectors/RedditPlatformPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostTransformer } from "../transformers/RedditPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberPosts(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.ICreate;
}): Promise<IRedditPlatformPost> {
  // Validate community exists and user is not banned
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.body.communityId },
    });
  if (!community) throw new HttpException("Community not found", 404);
  // Check user is subscribed to community
  const subscription =
    await MyGlobal.prisma.reddit_platform_subscriptions.findUnique({
      where: {
        user_id_community_id: {
          user_id: props.member.id,
          community_id: props.body.communityId,
        },
      },
    });
  if (!subscription)
    throw new HttpException("Must subscribe to community first", 403);
  // Check user is not banned
  const ban = await MyGlobal.prisma.reddit_platform_bans.findUnique({
    where: {
      community_id_user_id: {
        community_id: props.body.communityId,
        user_id: props.member.id,
      },
    },
  });
  if (ban && (!ban.expired_at || ban.expired_at > new Date())) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Validate post type and required fields
  if (props.body.type === "TEXT" && props.body.content === undefined) {
    throw new HttpException("Content is required for TEXT posts", 400);
  }
  if (props.body.type === "LINK" && props.body.url === undefined) {
    throw new HttpException("URL is required for LINK posts", 400);
  }
  if (props.body.type === "IMAGE" && props.body.imageUrl === undefined) {
    throw new HttpException("Image URL is required for IMAGE posts", 400);
  }
  // Use collector for database input transformation
  const created = await MyGlobal.prisma.reddit_platform_posts.create({
    data: await RedditPlatformPostCollector.collect({
      body: props.body,
      redditPlatformMembers: { id: props.member.id },
      redditPlatformCommunities: { id: props.body.communityId },
    }),
    ...RedditPlatformPostTransformer.select(),
  });
  // Transform to response DTO
  return await RedditPlatformPostTransformer.transform(created);
}
