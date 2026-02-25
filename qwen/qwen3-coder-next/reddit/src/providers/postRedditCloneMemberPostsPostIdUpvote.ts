import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneContentPostVoteCollector } from "../collectors/RedditCloneContentPostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneContentPostVoteTransformer } from "../transformers/RedditCloneContentPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditCloneMemberPostsPostIdUpvote(props: {
  member: MemberPayload;
  postId: string;
}): Promise<IRedditCloneContentPostVote> {
  // Verify post exists
  const post =
    await MyGlobal.prisma.reddit_clone_content_posts.findUniqueOrThrow({
      where: { id: props.postId },
    });
  // Find existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_clone_content_post_votes.findFirst({
      where: {
        member_id: props.member.id,
        post_id: props.postId,
      },
    });
  let voteValue = 1;
  let voteId: string;
  if (existingVote) {
    if (existingVote.vote_value === 1) {
      // Already upvoted - remove vote
      await MyGlobal.prisma.reddit_clone_content_post_votes.delete({
        where: { id: existingVote.id },
      });
      voteValue = -1; // revert +1
      voteId = existingVote.id;
    } else if (existingVote.vote_value === -1) {
      // Downvoted - change to upvote (net +2)
      const updated =
        await MyGlobal.prisma.reddit_clone_content_post_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_value: 1,
            updated_at: toISOStringSafe(new Date()),
          },
        });
      voteValue = 2;
      voteId = updated.id;
    } else {
      voteId = existingVote.id;
    }
  } else {
    // Create new upvote
    const vote = await MyGlobal.prisma.reddit_clone_content_post_votes.create({
      data: await RedditCloneContentPostVoteCollector.collect({
        body: { voteType: "upvote" },
        redditCloneContentPosts: { id: props.postId },
        redditCloneMembers: props.member,
      }),
    });
    voteId = vote.id;
  }
  // Update post vote score
  await MyGlobal.prisma.reddit_clone_content_posts.update({
    where: { id: props.postId },
    data: {
      vote_score: { increment: voteValue },
    },
  });
  // Update author karma - Use correct field names based on Prisma schema
  // Post uses author_id, not user_id
  // Karma logs require id and user relation
  await MyGlobal.prisma.reddit_clone_content_karma_logs.upsert({
    where: { user_id: post.author_id },
    create: {
      id: v4(),
      user: {
        connect: { id: post.author_id },
      },
      score: voteValue,
    },
    update: { score: { increment: voteValue } },
  });
  // Return updated vote
  const vote =
    await MyGlobal.prisma.reddit_clone_content_post_votes.findUniqueOrThrow({
      where: { id: voteId },
      ...RedditCloneContentPostVoteTransformer.select(),
    });
  return await RedditCloneContentPostVoteTransformer.transform(vote);
}
