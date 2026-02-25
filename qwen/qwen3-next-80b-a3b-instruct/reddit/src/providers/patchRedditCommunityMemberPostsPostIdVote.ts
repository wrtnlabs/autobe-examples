import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
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

export async function patchRedditCommunityMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IRequest;
}): Promise<IRedditCommunityPostVote.ISummary> {
  // Validate post exists and get author_id
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { author_id: true, vote_score: true },
  });
  // Prevent voting on own post
  if (post.author_id === props.member.id) {
    throw new HttpException("USER_CANNOT_VOTE_ON_OWN_CONTENT", 403);
  }
  // Read existing vote record
  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirst({
      where: {
        user_id_post_id: { user_id: props.member.id, post_id: props.postId },
      },
    });
  // Determine delta and new vote type
  let delta: number;
  let newVoteType: "upvote" | "downvote" | "none";
  if (existingVote) {
    if (existingVote.vote_type === props.body.voteType) {
      // Same vote → remove it
      delta = existingVote.vote_type === "upvote" ? -1 : +1;
      newVoteType = "none";
    } else {
      // Change vote: upvote↔downvote → delta of ±2
      delta = existingVote.vote_type === "upvote" ? -2 : +2;
      newVoteType = props.body.voteType;
    }
  } else {
    // No existing vote
    if (props.body.voteType === "none") {
      throw new HttpException("INVALID_VOTE_STATE", 400);
    }
    delta = props.body.voteType === "upvote" ? +1 : -1;
    newVoteType = props.body.voteType;
  }
  // Use transaction to update vote record, post score, and author karma atomically
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update post vote_score
    const updatedPost = await prisma.reddit_community_posts.update({
      where: { id: props.postId },
      data: { vote_score: { increment: delta } },
    });
    // Update author's karma
    await prisma.reddit_community_members.update({
      where: { id: post.author_id },
      data: { karma_score: { increment: delta } },
    });
    // Update or delete vote record
    let updatedVote;
    if (newVoteType === "none") {
      await prisma.reddit_community_post_votes.delete({
        where: {
          user_id_post_id: { user_id: props.member.id, post_id: props.postId },
        },
      });
    } else {
      updatedVote = await prisma.reddit_community_post_votes.upsert({
        where: {
          user_id_post_id: { user_id: props.member.id, post_id: props.postId },
        },
        create: {
          id: v4(),
          post_id: props.postId,
          user_id: props.member.id,
          vote_type: newVoteType,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
        update: { vote_type: newVoteType },
      });
    }
    return updatedPost;
  });
  // Return the updated vote_score
  return {
    voteScore: result.vote_score,
  } satisfies IRedditCommunityPostVote.ISummary;
}
