import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
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
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        reddit_like_member_id: props.member.id,
        reddit_like_community_id: props.body.community_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (subscription === null) {
    throw new HttpException(
      "Member must be subscribed to the community to create posts",
      403,
    );
  }
  // Collect post data using the collector
  const postData = await RedditLikePostCollector.collect({
    body: props.body,
    redditLikeMembers: { id: props.member.id },
    redditLikeMemberSessions: { id: props.member.session_id },
  });
  // Create the post with transformer select for response
  const created = await MyGlobal.prisma.reddit_like_posts.create({
    data: postData,
    ...RedditLikePostTransformer.select(),
  });
  // Transform and return the result
  return await RedditLikePostTransformer.transform(created);
}
