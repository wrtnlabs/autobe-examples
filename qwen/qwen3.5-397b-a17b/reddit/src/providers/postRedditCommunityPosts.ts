import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostCollector } from "../collectors/RedditCommunityPostCollector";
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityPosts(props: {
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  };
  body: IRedditCommunityPost.ICreate;
}): Promise<IRedditCommunityPost> {
  // Validate user has active subscription to the community
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.body.community_id,
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException(
      "Forbidden: User must be subscribed to the community before creating posts",
      403,
    );
  }
  // Create the post using Collector for data transformation
  const record = await MyGlobal.prisma.reddit_community_posts.create({
    data: await RedditCommunityPostCollector.collect({
      body: props.body,
      redditCommunityMembers: { id: props.member.id },
      redditCommunityMemberSessions: { id: props.member.session_id },
    }),
    ...RedditCommunityPostTransformer.select(),
  });
  // Transform database record to DTO using Transformer
  return await RedditCommunityPostTransformer.transform(record);
}
