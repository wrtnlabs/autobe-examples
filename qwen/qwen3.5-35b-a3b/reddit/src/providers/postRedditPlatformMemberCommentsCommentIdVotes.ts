import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentVoteTransformer } from "../transformers/RedditPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.IVoteRequest;
}): Promise<IRedditPlatformCommentVote> {
  // Validate comment exists and is not deleted
  const comment =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        vote_score: true,
        author_id: true,
        post: {
          select: {
            reddit_platform_community_id: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Prevent voting on own comments
  if (comment.author_id === props.member.id) {
    throw new HttpException("You cannot vote on your own comment", 400);
  }
  // Get community_id from comment's post
  const communityId = comment.post?.reddit_platform_community_id;
  if (!communityId) {
    throw new HttpException("Comment has no associated community", 400);
  }
  // Check if member is banned from the comment's community
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
    where: {
      community_id: communityId,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Handle vote removal
  if (props.body.vote_type === undefined || props.body.vote_type === null) {
    const existingVote =
      await MyGlobal.prisma.reddit_platform_comment_votes.findFirst({
        where: {
          comment_id: props.commentId,
          user_id: props.member.id,
          deleted_at: null,
        },
      });
    if (existingVote !== null) {
      await MyGlobal.prisma.reddit_platform_comment_votes.delete({
        where: {
          id: existingVote.id,
        },
      });
    }
  }
  // Handle vote creation or update
  else {
    const newVoteType: "UPVOTE" | "DOWNVOTE" =
      props.body.vote_type === "upvote" ? "UPVOTE" : "DOWNVOTE";
    const existingVote =
      await MyGlobal.prisma.reddit_platform_comment_votes.findFirst({
        where: {
          comment_id: props.commentId,
          user_id: props.member.id,
          deleted_at: null,
        },
      });
    if (existingVote === null) {
      // Create new vote
      await MyGlobal.prisma.reddit_platform_comment_votes.create({
        data: {
          id: v4(),
          user_id: props.member.id,
          comment_id: props.commentId,
          vote_type: newVoteType,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    } else if (existingVote.vote_type !== newVoteType) {
      // Update existing vote
      await MyGlobal.prisma.reddit_platform_comment_votes.update({
        where: {
          id: existingVote.id,
        },
        data: {
          vote_type: newVoteType,
          updated_at: new Date(),
        },
      });
    }
  }
  // Recalculate vote score
  const votes = await MyGlobal.prisma.reddit_platform_comment_votes.findMany({
    where: {
      comment_id: props.commentId,
      deleted_at: null,
    },
    select: {
      vote_type: true,
    },
  });
  const newVoteScore = votes.reduce((sum, vote) => {
    if (vote.vote_type === "UPVOTE") return sum + 1;
    if (vote.vote_type === "DOWNVOTE") return sum - 1;
    return sum;
  }, 0);
  // Update comment vote score
  await MyGlobal.prisma.reddit_platform_comments.update({
    where: {
      id: props.commentId,
    },
    data: {
      vote_score: newVoteScore,
      updated_at: new Date(),
    },
  });
  // Fetch updated vote record with relations
  const vote =
    await MyGlobal.prisma.reddit_platform_comment_votes.findFirstOrThrow({
      where: {
        comment_id: props.commentId,
        user_id: props.member.id,
        deleted_at: null,
      },
      ...RedditPlatformCommentVoteTransformer.select(),
    });
  return await RedditPlatformCommentVoteTransformer.transform(vote);
}
