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
import { RedditLikePostCollector } from "../collectors/RedditLikePostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostTransformer } from "../transformers/RedditLikePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberPosts(props: {
  member: MemberPayload;
  body: IRedditLikePost.ICreate;
}): Promise<IRedditLikePost> {
  // Validate community exists
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: props.body.community_id },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Verify subscription
  const subscription =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        reddit_like_member_id: props.member.id,
        reddit_like_community_id: props.body.community_id,
        deleted_at: null,
      },
    });
  if (subscription === null) {
    throw new HttpException("Subscription not found", 403);
  }
  // Validate content_type
  if (!["text", "link", "image"].includes(props.body.content_type)) {
    throw new HttpException("Invalid content type", 400);
  }
  // Validate content fields based on content_type
  if (props.body.content_type === "text" && !props.body.content_text) {
    throw new HttpException("Content text is required for text posts", 400);
  }
  if (props.body.content_type === "link" && !props.body.content_url) {
    throw new HttpException("Content URL is required for link posts", 400);
  }
  // Create post using collector
  const record = await MyGlobal.prisma.reddit_like_posts.create({
    data: await RedditLikePostCollector.collect({
      body: props.body,
      member: props.member,
    }),
    ...RedditLikePostTransformer.select(),
  });
  return await RedditLikePostTransformer.transform(record);
}
