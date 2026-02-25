import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
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

export async function postRedditCloneMemberPostsPostIdDownvote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneContentPostVote> {
  const post =
    await MyGlobal.prisma.reddit_clone_content_posts.findUniqueOrThrow({
      where: { id: props.postId },
    });
  // Check if user already voted on this post
  const existingVote =
    await MyGlobal.prisma.reddit_clone_content_post_votes.findFirst({
      where: {
        member_id: props.member.id,
        post_id: props.postId,
      },
    });
  const now = new Date();
  const voteValue = -1;
  let voteRecord;
  if (existingVote) {
    // User already voted - need to adjust scores based on previous vote
    const previousValue = existingVote.vote_value;
    // Update vote record
    voteRecord = await MyGlobal.prisma.reddit_clone_content_post_votes.update({
      where: { id: existingVote.id },
      data: {
        vote_value: voteValue,
        updated_at: now,
      },
    });
    // Update post score based on previous vote value
    let scoreChange = 0;
    if (previousValue === 1) {
      scoreChange = -2; // Was upvote, now downvote
    } else if (previousValue === -1) {
      scoreChange = 0; // Was already downvote - shouldn't happen but handle anyway
    } else if (previousValue === 0) {
      scoreChange = -1; // Was removed vote, now downvote
    }
    await MyGlobal.prisma.reddit_clone_content_posts.update({
      where: { id: props.postId },
      data: { vote_score: { increment: scoreChange } },
    });
    // Update author karma if different user
    if (post.author_id !== props.member.id) {
      let karmaChange = 0;
      if (previousValue === 1) {
        karmaChange = -2; // Was upvote, now downvote
      } else if (previousValue === -1) {
        karmaChange = 2; // Was downvote, now upvote
      } else if (previousValue === 0) {
        karmaChange = -1; // Was no vote, now downvote
      }
      await MyGlobal.prisma.reddit_clone_karmas.update({
        where: { id: post.author_id },
        data: { karma_score: { increment: karmaChange } },
      });
    }
  } else {
    // No existing vote - create new vote record
    voteRecord = await MyGlobal.prisma.reddit_clone_content_post_votes.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        post_id: props.postId,
        vote_value: voteValue,
        created_at: now,
        updated_at: now,
      },
    });
    // Update post score
    await MyGlobal.prisma.reddit_clone_content_posts.update({
      where: { id: props.postId },
      data: { vote_score: { increment: -1 } },
    });
    // Update author karma if different user
    if (post.author_id !== props.member.id) {
      await MyGlobal.prisma.reddit_clone_karmas.update({
        where: { id: post.author_id },
        data: { karma_score: { increment: -1 } },
      });
    }
  }
  return {
    id: voteRecord.id,
    vote_value: voteRecord.vote_value,
    created_at: voteRecord.created_at.toISOString(),
    updated_at: voteRecord.updated_at.toISOString(),
  };
}
