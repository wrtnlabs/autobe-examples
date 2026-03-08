import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommentTransformer } from "../transformers/RedditLikeCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditLikeMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeCommentVote.ICreate;
}): Promise<IRedditLikeComment> {
  // Check if comment exists and is not deleted
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      author_id: true,
      post_id: true,
      vote_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author: {
        select: {
          id: true,
          created_at: true,
        },
      },
      post: {
        select: {
          id: true,
          created_at: true,
          title: true,
          score: true,
          comment_count: true,
          author: {
            select: {
              id: true,
              created_at: true,
            },
          },
          community: {
            select: {
              id: true,
              created_at: true,
              name: true,
              icon_url: true,
            },
          },
        },
      },
      parentComment: {
        select: { id: true },
      },
      replies: {
        select: { id: true },
      },
      reports: {
        select: { id: true },
      },
      revisions: {
        select: { id: true },
      },
      votes: {
        select: { id: true },
      },
      votesSum: {
        select: { id: true },
      },
    },
  });
  // Check if user already voted on this comment
  const existingVote =
    await MyGlobal.prisma.reddit_like_comment_votes.findFirst({
      where: {
        reddit_like_comment_id: props.commentId,
        reddit_like_member_id: props.member.id,
      },
    });
  // Handle vote value
  if (props.body.value === 0) {
    // Remove vote if value is 0 (none)
    if (existingVote) {
      await MyGlobal.prisma.reddit_like_comment_votes.delete({
        where: { id: existingVote.id },
      });
    }
  } else if (existingVote) {
    // Update existing vote
    await MyGlobal.prisma.reddit_like_comment_votes.update({
      where: { id: existingVote.id },
      data: {
        value: props.body.value,
      },
    });
  } else {
    // Create new vote
    await MyGlobal.prisma.reddit_like_comment_votes.create({
      data: {
        id: v4(),
        value: props.body.value,
        created_at: new Date(),
        comment: { connect: { id: props.commentId } },
        member: { connect: { id: props.member.id } },
      },
    });
  }
  // Update comment vote score by recalculating from votes
  const votes = await MyGlobal.prisma.reddit_like_comment_votes.findMany({
    where: { reddit_like_comment_id: props.commentId },
  });
  const newVoteScore = votes.reduce((sum, vote) => sum + vote.value, 0);
  await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: props.commentId },
    data: { vote_score: newVoteScore },
  });
  // Update vote score sum record if exists
  const votesSum =
    await MyGlobal.prisma.reddit_like_comment_votes_sums.findUnique({
      where: { comment_id: props.commentId },
    });
  if (votesSum) {
    await MyGlobal.prisma.reddit_like_comment_votes_sums.update({
      where: { comment_id: props.commentId },
      data: { vote_sum: newVoteScore },
    });
  }
  // Re-fetch comment with updated vote score
  const updatedComment =
    await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: {
          select: {
            id: true,
            created_at: true,
          },
        },
        post: {
          select: {
            id: true,
            created_at: true,
            title: true,
            score: true,
            comment_count: true,
            author: {
              select: {
                id: true,
                created_at: true,
              },
            },
            community: {
              select: {
                id: true,
                created_at: true,
                name: true,
                icon_url: true,
              },
            },
          },
        },
        parentComment: {
          select: { id: true },
        },
        replies: {
          select: { id: true },
        },
        reports: {
          select: { id: true },
        },
        revisions: {
          select: { id: true },
        },
        votes: {
          select: { id: true },
        },
        votesSum: {
          select: { id: true },
        },
      },
    });
  return await RedditLikeCommentTransformer.transform(updatedComment);
}
