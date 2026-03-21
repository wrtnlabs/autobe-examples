import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostImageTransformer } from "../transformers/RedditClonePostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditClonePostImage.IUpdate;
}): Promise<IRedditClonePostImage> {
  // Step 1: Retrieve the existing vote
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUnique({
    where: { id: props.voteId },
    select: {
      id: true,
      reddit_clone_post_id: true,
      reddit_clone_member_id: true,
      direction: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Step 2: Verify vote exists and belongs to the specified post
  if (vote === null || vote.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Vote not found", 404);
  }
  // Step 3: Verify the authenticated user owns the vote
  if (vote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Verify new direction differs from current
  if (vote.direction === props.body.direction) {
    throw new HttpException(
      "Vote direction is the same as current direction",
      400,
    );
  }
  // Step 5: Get the post author ID for karma adjustment
  const post = await MyGlobal.prisma.reddit_clone_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, reddit_clone_member_id: true },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  // Step 6: Calculate score and karma adjustments
  // upvote → downvote: vote_score -= 2, karma -= 1
  // downvote → upvote: vote_score += 2, karma += 1
  const scoreAdjustment = props.body.direction === "upvote" ? 2 : -2;
  const karmaAdjustment = props.body.direction === "upvote" ? 1 : -1;
  // Step 7: Execute transaction to update all related records
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    // Update vote direction
    MyGlobal.prisma.reddit_clone_post_votes.update({
      where: { id: props.voteId },
      data: {
        direction: props.body.direction,
        updated_at: now,
      },
    }),
    // Update post vote score
    MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: {
          increment: scoreAdjustment,
        },
      },
    }),
    // Update author karma
    MyGlobal.prisma.reddit_clone_user_karmas.update({
      where: {
        reddit_clone_member_id: post.reddit_clone_member_id,
      },
      data: {
        karma_score: {
          increment: karmaAdjustment,
        },
      },
    }),
  ]);
  // Step 8: Retrieve updated vote with member relation for transformer response
  const fullVote =
    await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...RedditClonePostImageTransformer.select(),
    });
  // Step 9: Transform and return the response
  return await RedditClonePostImageTransformer.transform(fullVote);
}
