import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { IRedditPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPostTextCollector } from "../collectors/RedditPostTextCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPostTextTransformer } from "../transformers/RedditPostTextTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditMemberCommunitiesCommunityIdPosts(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPostText.ICreate;
}): Promise<IRedditPostText> {
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findFirst({
      where: {
        community_id: props.communityId,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException("User not subscribed to this community", 403);
  }
  if (props.body.post_type === "text" && props.body.content.length < 10) {
    throw new HttpException("Text content must be at least 10 characters", 400);
  }
  if (
    props.body.post_type === "link" &&
    !/^(https|http):\/\//.test(props.body.content)
  ) {
    throw new HttpException("Invalid URL format for link post", 400);
  }
  if (
    props.body.post_type === "image" &&
    !/^(https|http):\/\//.test(props.body.content)
  ) {
    throw new HttpException("Image URI must be a valid HTTP/HTTPS URL", 400);
  }
  const created = await MyGlobal.prisma.reddit_posts.create({
    data: await RedditPostTextCollector.collect({
      body: props.body,
      redditCommunities: { id: props.communityId },
      redditMembers: { id: props.member.id },
    }),
    ...RedditPostTextTransformer.select(),
  });
  return await RedditPostTextTransformer.transform(created);
}
