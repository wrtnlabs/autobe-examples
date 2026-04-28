import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
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

export async function patchRedditLikeCommunityMemberReportsReportIdReportOnCommentsReportOnCommentId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  reportOnCommentId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityReportOnComment.IResolution;
}): Promise<void> {
  const report =
    await MyGlobal.prisma.reddit_like_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        status: true,
        target_type: true,
        reddit_like_community_community_id: true,
      },
    });
  if (report.status !== "pending") {
    throw new HttpException("Report is not in pending status", 400);
  }
  if (report.target_type !== "comment") {
    throw new HttpException("Report does not target a comment", 400);
  }
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_community_id:
          report.reddit_like_community_community_id,
      },
    });
  if (moderatorRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  const junction =
    await MyGlobal.prisma.reddit_like_community_report_on_comments.findUniqueOrThrow(
      {
        where: { id: props.reportOnCommentId },
        select: {
          reddit_like_community_report_id: true,
          reddit_like_community_comment_id: true,
        },
      },
    );
  if (junction.reddit_like_community_report_id !== props.reportId) {
    throw new HttpException(
      "Junction record does not link to the specified report",
      400,
    );
  }
  const now = new Date();
  const targetCommentId = junction.reddit_like_community_comment_id;
  if (props.body.resolutionType === "approve") {
    const allCommentIds = new Set<string>([targetCommentId]);
    let parentIdsToExpand: string[] = [targetCommentId];
    while (parentIdsToExpand.length > 0) {
      const children =
        await MyGlobal.prisma.reddit_like_community_comments.findMany({
          where: { parent_comment_id: { in: parentIdsToExpand } },
          select: { id: true },
        });
      parentIdsToExpand = [];
      for (const child of children) {
        if (!allCommentIds.has(child.id)) {
          allCommentIds.add(child.id);
          parentIdsToExpand.push(child.id);
        }
      }
    }
    const commentEntries =
      await MyGlobal.prisma.reddit_like_community_comments.findMany({
        where: { id: { in: Array.from(allCommentIds) } },
        select: { id: true, member_id: true },
      });
    const commentAuthorMap = new Map<string, string>();
    for (const entry of commentEntries) {
      commentAuthorMap.set(entry.id, entry.member_id);
    }
    const voteEntries =
      await MyGlobal.prisma.reddit_like_community_comment_votes.findMany({
        where: {
          reddit_like_community_comment_id: { in: Array.from(allCommentIds) },
        },
        select: { direction: true, reddit_like_community_comment_id: true },
      });
    const karmaAdjustments = new Map<string, number>();
    for (const vote of voteEntries) {
      const authorId = commentAuthorMap.get(
        vote.reddit_like_community_comment_id,
      );
      if (authorId !== undefined) {
        const adjustment = vote.direction === "upvote" ? -1 : 1;
        karmaAdjustments.set(
          authorId,
          (karmaAdjustments.get(authorId) ?? 0) + adjustment,
        );
      }
    }
    for (const [memberId, adjustment] of karmaAdjustments) {
      await MyGlobal.prisma.reddit_like_community_profiles.updateMany({
        where: { reddit_like_community_member_id: memberId },
        data: { karma: { increment: adjustment } },
      });
    }
    await MyGlobal.prisma.reddit_like_community_comments.updateMany({
      where: { id: { in: Array.from(allCommentIds) } },
      data: { deleted_at: now },
    });
    await MyGlobal.prisma.reddit_like_community_report_on_comments.update({
      where: { id: props.reportOnCommentId },
      data: { deleted_at: now },
    });
  } else {
    await MyGlobal.prisma.reddit_like_community_report_on_comments.update({
      where: { id: props.reportOnCommentId },
      data: { deleted_at: now },
    });
  }
  await MyGlobal.prisma.reddit_like_community_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.resolutionType,
      resolved_by_member_id: props.member.id,
      resolved_at: now,
      updated_at: now,
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
// import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityMemberReportsReportIdReportOnCommentsReportOnCommentId(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
//   reportOnCommentId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityReportOnComment.IResolution;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------