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
  const communityId: string & tags.Format<"uuid"> =
    props.body.redditPlatformCommunityId;
  const subscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findFirst({
      where: {
        member: { id: props.member.id },
        community: { id: communityId },
        deleted_at: null,
      },
    });
  if (subscription === null) {
    throw new HttpException(
      "You must subscribe to this community to post",
      403,
    );
  }
  const created = await MyGlobal.prisma.reddit_platform_posts.create({
    data: await RedditPlatformPostCollector.collect({
      body: props.body,
      redditPlatformMembers: { id: props.member.id } satisfies IEntity,
      redditPlatformMemberSessions: {
        id: props.member.session_id,
      } satisfies IEntity,
    }),
    ...RedditPlatformPostTransformer.select(),
  });
  const response: IRedditPlatformPost =
    await RedditPlatformPostTransformer.transform(created);
  return response;
}
