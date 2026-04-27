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

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1-2: Find the vote by primary key (404 if not found via findUniqueOrThrow)
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: {
        id: true,
        community_platform_comment_id: true,
        community_platform_member_id: true,
        value: true,
      },
    });
  // Step 3: Validate that the vote belongs to the specified comment
  if (vote.community_platform_comment_id !== props.commentId) {
    throw new HttpException(
      "Vote does not belong to the specified comment",
      422,
    );
  }
  // Step 4-5: Validate the comment belongs to the specified post, get author id for karma
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        community_platform_post_id: true,
        community_platform_member_id: true,
      },
    });
  if (comment.community_platform_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      422,
    );
  }
  // Step 6: Verify the requesting authenticated member is the voter
  if (vote.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 7: Save the removed vote value before deletion (for karma adjustment)
  const removedValue = vote.value;
  // Step 8: Delete the vote row
  await MyGlobal.prisma.community_platform_comment_votes.delete({
    where: { id: props.voteId },
  });
  // Step 9: Recalculate comment vote_score by summing remaining vote values
  const aggregation =
    await MyGlobal.prisma.community_platform_comment_votes.aggregate({
      where: { community_platform_comment_id: props.commentId },
      _sum: { value: true },
    });
  const newVoteScore = aggregation._sum.value ?? 0;
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: props.commentId },
    data: {
      vote_score: newVoteScore,
      updated_at: new Date(),
    },
  });
  // Step 10: Count remaining upvotes and downvotes for vote_summaries
  const upvoteCount =
    await MyGlobal.prisma.community_platform_comment_votes.count({
      where: {
        community_platform_comment_id: props.commentId,
        value: 1,
      },
    });
  const downvoteCount =
    await MyGlobal.prisma.community_platform_comment_votes.count({
      where: {
        community_platform_comment_id: props.commentId,
        value: -1,
      },
    });
  const netScore = upvoteCount - downvoteCount;
  await MyGlobal.prisma.community_platform_vote_summaries.upsert({
    where: {
      target_type_target_id: {
        target_type: "comment",
        target_id: props.commentId,
      },
    },
    create: {
      id: v4(),
      target_type: "comment",
      target_id: props.commentId,
      upvote_count: upvoteCount,
      downvote_count: downvoteCount,
      net_score: netScore,
      created_at: new Date(),
      updated_at: new Date(),
    },
    update: {
      upvote_count: upvoteCount,
      downvote_count: downvoteCount,
      net_score: netScore,
      updated_at: new Date(),
    },
  });
  // Step 11: Adjust the comment author's karma
  // Removing an upvote (+1) → author loses 1 karma
  // Removing a downvote (-1) → author gains 1 karma (decrement by -1 = increment by 1)
  await MyGlobal.prisma.community_platform_profiles.updateMany({
    where: { member_id: comment.community_platform_member_id },
    data: {
      karma: { decrement: removedValue },
      updated_at: new Date(),
    },
  });
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
// export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
//   voteId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------