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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string;
  body: ICommunityPostVote.ICreate;
}): Promise<ICommunityPostVote.IScore> {
  // Fetch post and verify not deleted
  const post = await MyGlobal.prisma.community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      community_id: true,
      is_deleted: true,
      vote_score: true,
      upvote_count: true,
      downvote_count: true,
    },
  });
  // Check if post is deleted
  if (post.is_deleted) {
    throw new HttpException("Post has been deleted", 410);
  }
  // Self-voting prevention
  if (post.author_id === props.member.id) {
    throw new HttpException("Cannot vote on your own post", 403);
  }
  // Check if banned from community
  const ban = await MyGlobal.prisma.community_bans.findFirst({
    where: {
      community_id: post.community_id,
      member_id: props.member.id,
      OR: [{ expired_at: null }, { expired_at: { gt: new Date() } }],
    },
  });
  if (ban) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Query existing vote
  const existingVote = await MyGlobal.prisma.community_post_votes.findUnique({
    where: {
      community_member_id_community_post_id: {
        community_member_id: props.member.id,
        community_post_id: props.postId,
      },
    },
  });
  const now = new Date();
  if (props.body.vote === 0) {
    // Remove vote
    if (existingVote) {
      await MyGlobal.prisma.$transaction([
        MyGlobal.prisma.community_post_votes.delete({
          where: { id: existingVote.id },
        }),
        MyGlobal.prisma.community_posts.update({
          where: { id: props.postId },
          data: {
            vote_score: existingVote.is_upvote
              ? { decrement: 1 }
              : { increment: 1 },
            upvote_count: existingVote.is_upvote ? { decrement: 1 } : undefined,
            downvote_count: existingVote.is_upvote
              ? undefined
              : { decrement: 1 },
          },
        }),
        MyGlobal.prisma.community_members.update({
          where: { id: post.author_id },
          data: {
            karma: existingVote.is_upvote ? { decrement: 1 } : { increment: 1 },
          },
        }),
      ]);
    }
  } else {
    const newIsUpvote = props.body.vote === 1;
    if (existingVote) {
      // Change vote - only if direction changed
      if (existingVote.is_upvote !== newIsUpvote) {
        await MyGlobal.prisma.$transaction([
          MyGlobal.prisma.community_post_votes.update({
            where: { id: existingVote.id },
            data: {
              is_upvote: newIsUpvote,
              updated_at: now,
            },
          }),
          MyGlobal.prisma.community_posts.update({
            where: { id: props.postId },
            data: {
              vote_score: newIsUpvote ? { increment: 2 } : { decrement: 2 },
              upvote_count: newIsUpvote ? { increment: 1 } : { decrement: 1 },
              downvote_count: newIsUpvote ? { decrement: 1 } : { increment: 1 },
            },
          }),
          MyGlobal.prisma.community_members.update({
            where: { id: post.author_id },
            data: {
              karma: newIsUpvote ? { increment: 2 } : { decrement: 2 },
            },
          }),
        ]);
      }
    } else {
      // New vote
      await MyGlobal.prisma.$transaction([
        MyGlobal.prisma.community_post_votes.create({
          data: {
            id: v4(),
            community_member_id: props.member.id,
            community_post_id: props.postId,
            is_upvote: newIsUpvote,
            created_at: now,
            updated_at: now,
          },
        }),
        MyGlobal.prisma.community_posts.update({
          where: { id: props.postId },
          data: {
            vote_score: newIsUpvote ? { increment: 1 } : { decrement: 1 },
            upvote_count: newIsUpvote ? { increment: 1 } : undefined,
            downvote_count: newIsUpvote ? undefined : { increment: 1 },
          },
        }),
        MyGlobal.prisma.community_members.update({
          where: { id: post.author_id },
          data: {
            karma: newIsUpvote ? { increment: 1 } : { decrement: 1 },
          },
        }),
      ]);
    }
  }
  // Fetch updated post metrics
  const updatedPost = await MyGlobal.prisma.community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      vote_score: true,
      upvote_count: true,
      downvote_count: true,
    },
  });
  return {
    voteScore: updatedPost.vote_score,
    upvoteCount: updatedPost.upvote_count,
    downvoteCount: updatedPost.downvote_count,
  } satisfies ICommunityPostVote.IScore;
}
