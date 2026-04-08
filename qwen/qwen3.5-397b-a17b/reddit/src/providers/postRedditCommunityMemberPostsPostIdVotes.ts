import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostVoteCollector } from "../collectors/RedditCommunityPostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostVoteTransformer } from "../transformers/RedditCommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.ICreate;
}): Promise<IRedditCommunityPostVote> {
  await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
  });
  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirst({
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_post_id: props.postId,
      },
    });
  if (existingVote) {
    await MyGlobal.prisma.reddit_community_post_votes.update({
      where: { id: existingVote.id },
      data: {
        value: props.body.value,
        updated_at: new Date(),
      },
    });
    const updated =
      await MyGlobal.prisma.reddit_community_post_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        ...RedditCommunityPostVoteTransformer.select(),
      });
    return await RedditCommunityPostVoteTransformer.transform(updated);
  }
  const created = await MyGlobal.prisma.reddit_community_post_votes.create({
    data: await RedditCommunityPostVoteCollector.collect({
      body: props.body,
      member: { id: props.member.id },
      post: { id: props.postId },
    }),
    ...RedditCommunityPostVoteTransformer.select(),
  });
  return await RedditCommunityPostVoteTransformer.transform(created);
}
