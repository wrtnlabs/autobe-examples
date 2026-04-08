import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostTransformer } from "../transformers/RedditLikePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePost> {
  // First query: verify post exists and get FK columns for authorization checks
  const record = await MyGlobal.prisma.reddit_like_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_like_member_id: true,
      reddit_like_community_id: true,
    },
  });
  // Check if member is the post author
  if (record.reddit_like_member_id === props.member.id) {
    const fullRecord =
      await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
        where: { id: props.postId },
        ...RedditLikePostTransformer.select(),
      });
    return await RedditLikePostTransformer.transform(fullRecord);
  }
  // Check if member is the community owner
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: record.reddit_like_community_id },
    select: { owner_id: true },
  });
  if (community?.owner_id === props.member.id) {
    const fullRecord =
      await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
        where: { id: props.postId },
        ...RedditLikePostTransformer.select(),
      });
    return await RedditLikePostTransformer.transform(fullRecord);
  }
  // Check if member is a community moderator
  const isModerator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_id: record.reddit_like_community_id,
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (isModerator !== null) {
    const fullRecord =
      await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
        where: { id: props.postId },
        ...RedditLikePostTransformer.select(),
      });
    return await RedditLikePostTransformer.transform(fullRecord);
  }
  // Check if member is subscribed to the community
  const isSubscriber =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        reddit_like_community_id: record.reddit_like_community_id,
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (isSubscriber === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Member is subscribed, return the post
  const fullRecord = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    ...RedditLikePostTransformer.select(),
  });
  return await RedditLikePostTransformer.transform(fullRecord);
}
