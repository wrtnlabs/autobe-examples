import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityReportTransformer } from "../transformers/REdditLikeCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IREdditLikeCommunityReport> {
  // Load report with full transform relations
  const report =
    await MyGlobal.prisma.reddit_like_community_reports.findFirstOrThrow({
      ...REdditLikeCommunityReportTransformer.select(),
      where: {
        id: props.reportId,
      },
    });
  // Verify moderator authorization in the report's community
  const moderator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_community_id: report.community.id,
        authority_type: {
          in: ["OWNER", "MODERATOR"],
        },
      },
    });
  if (moderator === null) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // Validate report is pending
  if (report.status !== "pending") {
    throw new HttpException("Report has already been handled", 409);
  }
  const now = new Date();
  // Execute atomic transaction for approval
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update report to approved
    await tx.reddit_like_community_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        resolved_by_member_id: props.member.id,
        resolved_at: now,
        updated_at: now,
      },
    });
    if (report.target_type === "post") {
      // Get post ID and author from junction
      const onPost = await tx.reddit_like_community_report_on_posts.findFirst({
        where: {
          reddit_like_community_report_id: props.reportId,
        },
        select: {
          reddit_like_community_post_id: true,
          post: {
            select: { author_id: true },
          },
        },
      });
      if (onPost === null) {
        throw new HttpException("Report target not found", 404);
      }
      const postId = onPost.reddit_like_community_post_id;
      const authorId = onPost.post.author_id;
      // Soft-delete the post
      await tx.reddit_like_community_posts.update({
        where: { id: postId },
        data: { deleted_at: now },
      });
      // Soft-delete all threaded comments under the post
      await tx.reddit_like_community_comments.updateMany({
        where: { post_id: postId },
        data: { deleted_at: now },
      });
      // Also soft-delete in alternative comment system
      await tx.reddit_like_community_post_comments.updateMany({
        where: { reddit_like_community_post_id: postId },
        data: { deleted_at: now },
      });
      // Adjust karma for post votes (direction: 'up' or 'down')
      const postVotes = await tx.reddit_like_community_post_votes.findMany({
        where: { reddit_like_community_post_id: postId },
        select: { direction: true },
      });
      let postVoteScore = 0;
      for (const vote of postVotes) {
        postVoteScore += vote.direction === "up" ? 1 : -1;
      }
      if (postVoteScore !== 0) {
        await tx.reddit_like_community_profiles.updateMany({
          where: { reddit_like_community_member_id: authorId },
          data: { karma: { decrement: postVoteScore } },
        });
      }
      // Adjust karma for votes on each deleted comment
      const deletedComments = await tx.reddit_like_community_comments.findMany({
        where: { post_id: postId },
        select: { id: true, member_id: true },
      });
      for (const comment of deletedComments) {
        const commentVotes =
          await tx.reddit_like_community_comment_votes.findMany({
            where: { reddit_like_community_comment_id: comment.id },
            select: { direction: true },
          });
        let commentVoteScore = 0;
        for (const vote of commentVotes) {
          commentVoteScore += vote.direction === "upvote" ? 1 : -1;
        }
        if (commentVoteScore !== 0) {
          await tx.reddit_like_community_profiles.updateMany({
            where: { reddit_like_community_member_id: comment.member_id },
            data: { karma: { decrement: commentVoteScore } },
          });
        }
      }
    }
    if (report.target_type === "comment") {
      // Get comment ID from junction
      const reportOnComment =
        await tx.reddit_like_community_report_on_comments.findFirst({
          where: { reddit_like_community_report_id: props.reportId },
          select: {
            reddit_like_community_comment_id: true,
          },
        });
      if (reportOnComment === null) {
        throw new HttpException("Report target not found", 404);
      }
      const targetCommentId = reportOnComment.reddit_like_community_comment_id;
      const deletedIds: string[] = [targetCommentId];
      // Soft-delete target comment
      await tx.reddit_like_community_comments.updateMany({
        where: { id: targetCommentId },
        data: { deleted_at: now },
      });
      // Iteratively soft-delete all child comments (recursive)
      while (true) {
        const childComments = await tx.reddit_like_community_comments.findMany({
          where: {
            parent_comment_id: { in: deletedIds },
            deleted_at: null,
          },
          select: { id: true },
        });
        if (childComments.length === 0) {
          break;
        }
        await tx.reddit_like_community_comments.updateMany({
          where: { id: { in: childComments.map((c) => c.id) } },
          data: { deleted_at: now },
        });
        deletedIds.push(...childComments.map((c) => c.id));
      }
      // Adjust karma for votes on target comment
      const commentVotes =
        await tx.reddit_like_community_comment_votes.findMany({
          where: { reddit_like_community_comment_id: targetCommentId },
          select: { direction: true },
        });
      let netVotes = 0;
      for (const vote of commentVotes) {
        netVotes += vote.direction === "upvote" ? 1 : -1;
      }
      if (netVotes !== 0) {
        const comment = await tx.reddit_like_community_comments.findUnique({
          where: { id: targetCommentId },
          select: { member_id: true },
        });
        if (comment !== null) {
          await tx.reddit_like_community_profiles.updateMany({
            where: { reddit_like_community_member_id: comment.member_id },
            data: { karma: { decrement: netVotes } },
          });
        }
      }
    }
  });
  // Return updated report
  const updated =
    await MyGlobal.prisma.reddit_like_community_reports.findFirstOrThrow({
      ...REdditLikeCommunityReportTransformer.select(),
      where: {
        id: props.reportId,
      },
    });
  return await REdditLikeCommunityReportTransformer.transform(updated);
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
// import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
// import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberReportsReportIdApprove(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<IREdditLikeCommunityReport> {
//   const record = await MyGlobal.prisma.reddit_like_community_reports.findFirstOrThrow({
//     ...REdditLikeCommunityReportTransformer.select(),
//     where: { ... },
//   });
//   return await REdditLikeCommunityReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------