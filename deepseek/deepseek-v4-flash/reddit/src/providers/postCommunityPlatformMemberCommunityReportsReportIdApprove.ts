import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportCommentTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCommentTarget";
import { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformMemberCommunityReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  // 1. Fetch the report to verify it exists and get its status + community
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        status: true,
        target_type: true,
        community_id: true,
      },
    });
  // 2. Verify the report is still pending
  if (report.status !== "pending") {
    const message =
      report.status === "approved"
        ? "Report has already been approved"
        : "Report has already been dismissed";
    throw new HttpException(message, 409);
  }
  // 3. Verify the requesting member is a moderator (or owner) of the community
  const moderation =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.member.id,
        community_id: report.community_id,
      },
    });
  if (moderation === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Update the report status to approved
  await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      updated_at: new Date(),
    },
  });
  // 5. Delete the reported content based on target_type
  if (report.target_type === "post") {
    const postTarget =
      await MyGlobal.prisma.community_platform_report_post_targets.findUniqueOrThrow(
        {
          where: { community_platform_report_id: props.reportId },
          select: { community_platform_post_id: true },
        },
      );
    await MyGlobal.prisma.community_platform_posts.update({
      where: { id: postTarget.community_platform_post_id },
      data: { deleted_at: new Date() },
    });
  } else if (report.target_type === "comment") {
    const commentTarget =
      await MyGlobal.prisma.community_platform_report_comment_targets.findUniqueOrThrow(
        {
          where: { community_platform_report_id: props.reportId },
          select: { community_platform_comment_id: true },
        },
      );
    await softDeleteCommentTree(commentTarget.community_platform_comment_id);
  }
  // 6. Fetch and return the full updated report
  const updated =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
  return await CommunityPlatformReportTransformer.transform(updated);
}
/**
 * Recursively soft-deletes a comment and all its nested replies.
 * Uses post-order traversal — children are deleted before their parent.
 */
async function softDeleteCommentTree(commentId: string): Promise<void> {
  const replies = await MyGlobal.prisma.community_platform_comments.findMany({
    where: {
      community_platform_comment_id: commentId,
      deleted_at: null,
    },
    select: { id: true },
  });
  for (const reply of replies) {
    await softDeleteCommentTree(reply.id);
  }
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: commentId },
    data: { deleted_at: new Date() },
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
// import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { ICommunityPlatformReportCommentTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCommentTarget";
// import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberCommunityReportsReportIdApprove(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<ICommunityPlatformReport> {
//   const record = await MyGlobal.prisma.community_platform_reports.findFirstOrThrow({
//     ...CommunityPlatformReportTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityPlatformReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------