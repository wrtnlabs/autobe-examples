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

export async function deleteRedditCloneMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the active vote for this member on this post
  const vote = await MyGlobal.prisma.reddit_clone_votes.findFirst({
    where: {
      member_id: props.member.id,
      target_type: "POST",
      target_id: props.postId,
      deleted_at: null,
    },
  });
  // If no active vote exists, return success (idempotent operation)
  if (vote === null) {
    return;
  }
  // Get the post to find the author for karma adjustment
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { member_id: true },
  });
  // Calculate karma change: UPVOTE contributed +1, DOWNVOTE contributed -1
  // Removing vote reverses the impact
  const karmaChange = vote.vote_type === "UPVOTE" ? -1 : 1;
  // Get the karma score record id for the post author
  const karmaScore = await MyGlobal.prisma.reddit_clone_karma_scores.findUnique(
    {
      where: { member_id: post.member_id },
      select: { id: true },
    },
  );
  // Handle case where karma score doesn't exist
  if (karmaScore === null) {
    throw new HttpException("Karma score not found", 404);
  }
  // Soft delete the vote
  await MyGlobal.prisma.reddit_clone_votes.update({
    where: { id: vote.id },
    data: {
      deleted_at: new Date(),
    },
  });
  // Update the post author's karma score
  await MyGlobal.prisma.reddit_clone_karma_scores.update({
    where: { member_id: post.member_id },
    data: {
      score: { increment: karmaChange },
      updated_at: new Date(),
    },
  });
  // Record the karma change for audit trail
  await MyGlobal.prisma.reddit_clone_karma_score_changes.create({
    data: {
      id: v4(),
      karmaScore: { connect: { id: karmaScore.id } },
      source_type: "POST",
      source_id: props.postId,
      change_amount: karmaChange,
      created_at: new Date(),
    },
  });
}
