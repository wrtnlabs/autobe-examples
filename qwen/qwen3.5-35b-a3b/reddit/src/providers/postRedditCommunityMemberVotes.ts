import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityVoteTransformer } from "../transformers/RedditCommunityVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberVotes(props: {
  member: MemberPayload;
  body: IRedditCommunityVote.ICreate;
}): Promise<IRedditCommunityVote> {
  // Validate exactly one target is provided
  if (
    props.body.target_post_id === undefined &&
    props.body.target_comment_id === undefined
  ) {
    throw new HttpException("Exactly one target must be specified", 400);
  }
  if (
    props.body.target_post_id !== undefined &&
    props.body.target_comment_id !== undefined
  ) {
    throw new HttpException("Only one target can be specified", 400);
  }
  // Create vote record
  const vote = await MyGlobal.prisma.reddit_community_votes.create({
    data: {
      id: v4(),
      member: { connect: { id: props.member.id } },
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      ...(props.body.target_post_id && {
        targetPost: { connect: { id: props.body.target_post_id! } },
      }),
      ...(props.body.target_comment_id && {
        targetComment: { connect: { id: props.body.target_comment_id! } },
      }),
    },
  });
  // Update karma and create subtype record
  const voteDirection = props.body.vote_type === "upvote" ? 1 : -1;
  if (props.body.target_post_id !== undefined) {
    const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow(
      {
        where: { id: props.body.target_post_id! },
        select: { author_id: true },
      },
    );
    await MyGlobal.prisma.reddit_community_user_karmas.upsert({
      where: { reddit_community_member_id: post.author_id },
      create: {
        id: v4(),
        reddit_community_member_id: post.author_id,
        current_score: voteDirection,
        created_at: new Date(),
        updated_at: new Date(),
      },
      update: {
        current_score: { increment: voteDirection },
        updated_at: new Date(),
      },
    });
    await MyGlobal.prisma.reddit_community_vote_of_posts.create({
      data: {
        id: v4(),
        vote_id: vote.id,
        post_id: props.body.target_post_id!,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  } else if (props.body.target_comment_id !== undefined) {
    const comment =
      await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
        where: { id: props.body.target_comment_id! },
        select: { reddit_community_members_id: true },
      });
    await MyGlobal.prisma.reddit_community_user_karmas.upsert({
      where: {
        reddit_community_member_id: comment.reddit_community_members_id,
      },
      create: {
        id: v4(),
        reddit_community_member_id: comment.reddit_community_members_id,
        current_score: voteDirection,
        created_at: new Date(),
        updated_at: new Date(),
      },
      update: {
        current_score: { increment: voteDirection },
        updated_at: new Date(),
      },
    });
    await MyGlobal.prisma.reddit_community_vote_of_comments.create({
      data: {
        id: v4(),
        vote_id: vote.id,
        comment_id: props.body.target_comment_id!,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // Query full vote with relations using transformer's select
  const fullVote =
    await MyGlobal.prisma.reddit_community_votes.findUniqueOrThrow({
      where: { id: vote.id },
      ...RedditCommunityVoteTransformer.select(),
    });
  return await RedditCommunityVoteTransformer.transform(fullVote);
}
