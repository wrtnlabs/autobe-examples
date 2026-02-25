import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
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
  // Verify user is subscribed to the target community
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findUniqueOrThrow({
      where: {
        user_id_community_id: {
          user_id: props.member.id,
          community_id: props.body.community_id,
        },
      },
    });
  // Create the post using the pre-built collector
  const created = await MyGlobal.prisma.reddit_community_posts.create({
    data: await RedditCommunityPostCollector.collect({
      body: props.body,
      redditCommunityMembers: { id: props.member.id },
    }),
    ...RedditCommunityPostTransformer.select(),
  });
  // Return transformed response with full context
  return await RedditCommunityPostTransformer.transform(created);
}
