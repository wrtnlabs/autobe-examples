import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostVoteTransformer } from "../transformers/RedditPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberPostVotes(props: {
  member: MemberPayload;
  body: IRedditPlatformPostVote.ICreate;
}): Promise<IRedditPlatformPostVote> {
  // Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_platform_posts.findFirst({
    where: {
      id: props.body.post_id,
      deleted_at: null,
    },
    select: {
      id: true,
      community: { select: { id: true } },
      vote_score: true,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  // Check if member is banned from the post's community
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
    where: {
      community_id: post.community.id,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Check for existing vote from this member on this post
  const existingVote =
    await MyGlobal.prisma.reddit_platform_post_votes.findFirst({
      where: {
        user_id: props.member.id,
        post_id: props.body.post_id,
        deleted_at: null,
      },
    });
  if (existingVote === null) {
    // No existing vote - create new one
    await MyGlobal.prisma.reddit_platform_post_votes.create({
      data: {
        id: v4(),
        user: { connect: { id: props.member.id } },
        post: { connect: { id: props.body.post_id } },
        vote_type: props.body.vote_type,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Update post engagement stats
    const engagementStats =
      await MyGlobal.prisma.reddit_platform_post_engagement_stats.findFirst({
        where: { post_id: props.body.post_id },
      });
    const voteAdjustment = props.body.vote_type === "UPVOTE" ? 1 : -1;
    if (engagementStats) {
      await MyGlobal.prisma.reddit_platform_post_engagement_stats.update({
        where: { id: engagementStats.id },
        data: {
          upvote_count: {
            increment: props.body.vote_type === "UPVOTE" ? 1 : 0,
          },
          downvote_count: {
            increment: props.body.vote_type === "DOWNVOTE" ? 1 : 0,
          },
        },
      });
    } else {
      await MyGlobal.prisma.reddit_platform_post_engagement_stats.create({
        data: {
          id: v4(),
          post_id: props.body.post_id,
          upvote_count: props.body.vote_type === "UPVOTE" ? 1 : 0,
          downvote_count: props.body.vote_type === "DOWNVOTE" ? 1 : 0,
          view_count: 0,
          last_viewed_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    // Update member karma
    await MyGlobal.prisma.reddit_platform_members.update({
      where: { id: props.member.id },
      data: {
        karma_score: {
          increment: voteAdjustment,
        },
      },
    });
  } else {
    // Existing vote found - update it
    const oldVoteType = existingVote.vote_type;
    if (oldVoteType !== props.body.vote_type) {
      // Different vote - update
      const adjustment =
        oldVoteType === "UPVOTE" && props.body.vote_type === "DOWNVOTE"
          ? -2
          : oldVoteType === "DOWNVOTE" && props.body.vote_type === "UPVOTE"
            ? 2
            : 0;
      await MyGlobal.prisma.reddit_platform_post_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: props.body.vote_type,
          updated_at: new Date(),
        },
      });
      // Update post engagement stats
      const engagementStats =
        await MyGlobal.prisma.reddit_platform_post_engagement_stats.findFirst({
          where: { post_id: props.body.post_id },
        });
      if (engagementStats) {
        await MyGlobal.prisma.reddit_platform_post_engagement_stats.update({
          where: { id: engagementStats.id },
          data: {
            upvote_count: {
              increment: props.body.vote_type === "UPVOTE" ? 1 : -1,
            },
            downvote_count: {
              increment: props.body.vote_type === "DOWNVOTE" ? 1 : -1,
            },
          },
        });
      }
      // Update member karma
      await MyGlobal.prisma.reddit_platform_members.update({
        where: { id: props.member.id },
        data: {
          karma_score: {
            increment: adjustment,
          },
        },
      });
    }
  }
  // Return the complete vote record using transformer
  const vote =
    await MyGlobal.prisma.reddit_platform_post_votes.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        post_id: props.body.post_id,
      },
      ...RedditPlatformPostVoteTransformer.select(),
    });
  return await RedditPlatformPostVoteTransformer.transform(vote);
}
