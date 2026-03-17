import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
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
  // Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: {
        id: props.body.community_id,
        deleted_at: null,
      },
    });
  // Verify member has active subscription to the community
  const subscription =
    await MyGlobal.prisma.reddit_clone_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.body.community_id,
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException(
      "Must subscribe to community before creating posts",
      403,
    );
  }
  // Create post using collector for data transformation
  const created = await MyGlobal.prisma.reddit_clone_posts.create({
    data: await RedditClonePostCollector.collect({
      body: props.body,
      member: { id: props.member.id },
    }),
    ...RedditClonePostTransformer.select(),
  });
  // Transform and return the created post
  return await RedditClonePostTransformer.transform(created);
}
