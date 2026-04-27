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

/**
 * Remove your own vote from a post or comment.
 *
 * Removes the authenticated member's vote (either upvote or downvote) from the
 * specified post or comment. Only the original voter can remove their own vote
 * — attempting to remove another member's vote is rejected with 403 Forbidden.
 *
 * After removal, the system automatically recalculates the target content's
 * vote score (net_score = upvote_count - downvote_count) in the vote summary
 * table, and adjusts the content author's karma score accordingly: removing
 * an upvote decreases the author's karma by 1, while removing a downvote
 * increases the author's karma by 1.
 */
export async function deleteCommunityPlatformMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // ----------------------------------------------------------------
  // 1. Fetch the vote record by voteId
  // ----------------------------------------------------------------
  const vote = await MyGlobal.prisma.community_platform_votes.findUnique({
    where: { id: props.voteId },
  });
  if (vote === null) {
    throw new HttpException("Vote not found", 404);
  }
  // ----------------------------------------------------------------
  // 2. Verify ownership — only the original voter can remove their vote
  // ----------------------------------------------------------------
  if (vote.voter_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // ----------------------------------------------------------------
  // 3. Capture vote details before deletion
  // ----------------------------------------------------------------
  const voteValue: number = vote.value;
  const targetType: string = vote.target_type;
  const targetId: string = vote.target_id;
  const isUpvote: boolean = voteValue === 1;
  // ----------------------------------------------------------------
  // 4. Find the content author for karma adjustment
  //    (skip if content already deleted — author not found)
  // ----------------------------------------------------------------
  let authorMemberId: string | null = null;
  if (targetType === "post") {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: targetId },
      select: { member_id: true },
    });
    if (post !== null) {
      authorMemberId = post.member_id;
    }
  } else if (targetType === "comment") {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: targetId },
        select: { community_platform_member_id: true },
      });
    if (comment !== null) {
      authorMemberId = comment.community_platform_member_id;
    }
  }
  // ----------------------------------------------------------------
  // 5. Hard-delete the vote record
  // ----------------------------------------------------------------
  await MyGlobal.prisma.community_platform_votes.delete({
    where: { id: props.voteId },
  });
  // ----------------------------------------------------------------
  // 6. Update vote summary (upsert pattern)
  // ----------------------------------------------------------------
  const existingSummary =
    await MyGlobal.prisma.community_platform_vote_summaries.findUnique({
      where: {
        target_type_target_id: {
          target_type: targetType,
          target_id: targetId,
        },
      },
    });
  if (existingSummary !== null) {
    const newUpvoteCount: number = isUpvote
      ? Math.max(0, existingSummary.upvote_count - 1)
      : existingSummary.upvote_count;
    const newDownvoteCount: number = isUpvote
      ? existingSummary.downvote_count
      : Math.max(0, existingSummary.downvote_count - 1);
    const newNetScore: number = newUpvoteCount - newDownvoteCount;
    await MyGlobal.prisma.community_platform_vote_summaries.update({
      where: { id: existingSummary.id },
      data: {
        upvote_count: newUpvoteCount,
        downvote_count: newDownvoteCount,
        net_score: newNetScore,
        updated_at: new Date().toISOString(),
      },
    });
  } else {
    // No summary exists — create one with zero counts
    await MyGlobal.prisma.community_platform_vote_summaries.create({
      data: {
        id: v4(),
        target_type: targetType,
        target_id: targetId,
        upvote_count: 0,
        downvote_count: 0,
        net_score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }
  // ----------------------------------------------------------------
  // 7. Update author karma (skip if author or profile not found)
  //    Removing upvote → -1 karma, Removing downvote → +1 karma
  // ----------------------------------------------------------------
  if (authorMemberId !== null) {
    const profile =
      await MyGlobal.prisma.community_platform_profiles.findUnique({
        where: { member_id: authorMemberId },
        select: { id: true, karma: true },
      });
    if (profile !== null) {
      const karmaDelta: number = isUpvote ? -1 : 1;
      await MyGlobal.prisma.community_platform_profiles.update({
        where: { id: profile.id },
        data: {
          karma: profile.karma + karmaDelta,
          updated_at: new Date().toISOString(),
        },
      });
    }
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteCommunityPlatformMemberVotesVoteId(props: {
//   member: MemberPayload;
//   voteId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------