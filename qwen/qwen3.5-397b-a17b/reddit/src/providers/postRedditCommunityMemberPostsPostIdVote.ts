import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
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

export async function postRedditCommunityMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.ICreate;
}): Promise<IRedditCommunityPostVote> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_community_member_id: true,
      reddit_community_community_id: true,
      deleted_at: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post is deleted", 404);
  }
  if (post.reddit_community_member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own post", 400);
  }
  const ban = await MyGlobal.prisma.reddit_community_bans.findFirst({
    where: {
      reddit_community_community_id: post.reddit_community_community_id,
      reddit_community_member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirst({
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_post_id: props.postId,
        deleted_at: null,
      },
    });
  let vote: IRedditCommunityPostVote;
  if (existingVote !== null) {
    await MyGlobal.prisma.reddit_community_post_votes.update({
      where: { id: existingVote.id },
      data: {
        direction: props.body.direction,
        updated_at: new Date(),
      },
    });
    const found =
      await MyGlobal.prisma.reddit_community_post_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        ...RedditCommunityPostVoteTransformer.select(),
      });
    vote = await RedditCommunityPostVoteTransformer.transform(found);
  } else {
    const created = await MyGlobal.prisma.reddit_community_post_votes.create({
      data: await RedditCommunityPostVoteCollector.collect({
        body: props.body,
        redditCommunityMembers: { id: props.member.id },
        redditCommunityPosts: { id: props.postId },
      }),
      ...RedditCommunityPostVoteTransformer.select(),
    });
    vote = await RedditCommunityPostVoteTransformer.transform(created);
  }
  return vote;
}
