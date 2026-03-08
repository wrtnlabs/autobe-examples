import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
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
  // Verify member is subscribed to the target community
  const subscription =
    await MyGlobal.prisma.reddit_like_subscriptions.findFirst({
      where: {
        reddit_like_member_id: props.member.id,
        reddit_like_community_id: props.body.community_id,
        status: "subscribed",
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException(
      "You must be subscribed to this community to post",
      403,
    );
  }
  // Create the post using collector
  const created = await MyGlobal.prisma.reddit_like_posts.create({
    data: await RedditLikePostCollector.collect({
      body: props.body,
      redditLikeMembers: { id: props.member.id },
      redditLikeCommunities: { id: props.body.community_id },
    }),
    ...RedditLikePostTransformer.select(),
  });
  // Transform to response DTO
  return await RedditLikePostTransformer.transform(created);
}
