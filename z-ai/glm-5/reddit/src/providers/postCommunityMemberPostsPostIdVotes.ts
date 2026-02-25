import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostVoteTransformer } from "../transformers/CommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string;
  body: ICommunityPostVote.ICreate;
}): Promise<ICommunityPostVote> {
  // 1. Validate post exists and is not deleted
  const post = await MyGlobal.prisma.community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      community_id: true,
      is_deleted: true,
      text_content: true,
      link_url: true,
      post_type: true,
    },
  });
  if (post.is_deleted) {
    throw new HttpException("Post has been deleted", 400);
  }
  // 2. Self-voting prevention
  if (post.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own post", 403);
  }
  // 3. Ban check - check for active ban
  const ban = await MyGlobal.prisma.community_bans.findFirst({
    where: {
      member_id: props.member.id,
      community_id: post.community_id,
      OR: [{ expired_at: null }, { expired_at: { gt: new Date() } }],
    },
  });
  if (ban) {
    throw new HttpException("You are banned from this community", 403);
  }
  // 4. Check existing vote
  const existingVote = await MyGlobal.prisma.community_post_votes.findUnique({
    where: {
      community_member_id_community_post_id: {
        community_member_id: props.member.id,
        community_post_id: props.postId,
      },
    },
  });
  const isUpvote = props.body.vote === 1;
  // Case: Remove vote (vote = 0)
  if (props.body.vote === 0) {
    if (!existingVote) {
      throw new HttpException("No vote to remove", 400);
    }
    // Delete vote and update counts in transaction
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.community_post_votes.delete({
        where: { id: existingVote.id },
      });
      // Update post vote counts
      await tx.community_posts.update({
        where: { id: props.postId },
        data: {
          upvote_count: { increment: existingVote.is_upvote ? -1 : 0 },
          downvote_count: { increment: existingVote.is_upvote ? 0 : -1 },
          vote_score: { increment: existingVote.is_upvote ? -1 : 1 },
        },
      });
      // Reverse karma impact
      await tx.community_members.update({
        where: { id: post.author_id },
        data: {
          karma: { increment: existingVote.is_upvote ? -1 : 1 },
        },
      });
    });
    // Re-fetch to return the removed vote state (conceptually this is odd, but matches return type)
    // Actually, we should return the vote as it was before deletion for audit purposes
    // But since it's deleted, we need to construct a response
    // Per specification, return null for removal - but type doesn't allow null
    // This indicates the API design expects different handling
    throw new HttpException("Vote removed", 204);
  }
  // Case: Create new vote
  if (!existingVote) {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const vote = await tx.community_post_votes.create({
        data: {
          id: v4(),
          community_member_id: props.member.id,
          community_post_id: props.postId,
          is_upvote: isUpvote,
          created_at: new Date(),
          updated_at: new Date(),
        },
        ...CommunityPostVoteTransformer.select(),
      });
      // Update post vote counts
      await tx.community_posts.update({
        where: { id: props.postId },
        data: {
          upvote_count: { increment: isUpvote ? 1 : 0 },
          downvote_count: { increment: isUpvote ? 0 : 1 },
          vote_score: { increment: isUpvote ? 1 : -1 },
        },
      });
      // Update author karma
      await tx.community_members.update({
        where: { id: post.author_id },
        data: {
          karma: { increment: isUpvote ? 1 : -1 },
        },
      });
      return vote;
    });
    return await CommunityPostVoteTransformer.transform(created);
  }
  // Case: Change existing vote (different direction)
  if (existingVote.is_upvote !== isUpvote) {
    const updated = await MyGlobal.prisma.$transaction(async (tx) => {
      const vote = await tx.community_post_votes.update({
        where: { id: existingVote.id },
        data: {
          is_upvote: isUpvote,
          updated_at: new Date(),
        },
        ...CommunityPostVoteTransformer.select(),
      });
      // Swap vote counts: decrement old, increment new
      await tx.community_posts.update({
        where: { id: props.postId },
        data: {
          upvote_count: { increment: isUpvote ? 1 : -1 },
          downvote_count: { increment: isUpvote ? -1 : 1 },
          vote_score: { increment: isUpvote ? 2 : -2 },
        },
      });
      // Karma changes by ±2 when switching vote direction
      await tx.community_members.update({
        where: { id: post.author_id },
        data: {
          karma: { increment: isUpvote ? 2 : -2 },
        },
      });
      return vote;
    });
    return await CommunityPostVoteTransformer.transform(updated);
  }
  // Same vote direction - return existing vote
  const existingVoteRecord =
    await MyGlobal.prisma.community_post_votes.findUniqueOrThrow({
      where: { id: existingVote.id },
      ...CommunityPostVoteTransformer.select(),
    });
  return await CommunityPostVoteTransformer.transform(existingVoteRecord);
}
