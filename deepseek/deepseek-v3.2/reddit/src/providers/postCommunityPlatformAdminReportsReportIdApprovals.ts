import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportApprovalTransformer } from "../transformers/CommunityPlatformReportApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminReportsReportIdApprovals(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportApproval> {
  // 1. Load report with community context
  const report =
    await MyGlobal.prisma.community_platform_content_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        reporter_member_id: true,
        community_id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: {
          select: { id: true, name: true },
        } satisfies Prisma.community_platform_communitiesFindManyArgs,
      },
    });
  // 2. Validate report is pending
  if (report.status !== "pending") {
    throw new HttpException(
      `Report is not pending (status: ${report.status})`,
      400,
    );
  }
  // 3. Validate admin has moderation role in this community
  const moderationRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_member_id: props.admin.id,
        community_platform_community_id: report.community_id,
        deleted_at: null,
      },
    });
  if (!moderationRole) {
    throw new HttpException(
      "Admin does not have moderation role in this community",
      403,
    );
  }
  // 4. Prevent self-approval
  if (report.reporter_member_id === props.admin.id) {
    throw new HttpException("Cannot approve your own report", 400);
  }
  // 5. Check if already approved (should not exist but safety check)
  const existingApproval =
    await MyGlobal.prisma.community_platform_report_approvals.findUnique({
      where: { content_report_id: props.reportId },
    });
  if (existingApproval) {
    throw new HttpException("Report already approved", 409);
  }
  // 6. Determine content type and load content details
  const postReport =
    await MyGlobal.prisma.community_platform_report_of_posts.findUnique({
      where: { community_platform_content_report_id: props.reportId },
      select: { community_platform_post_id: true },
    });
  const commentReport =
    await MyGlobal.prisma.community_platform_report_of_comments.findUnique({
      where: { community_platform_content_report_id: props.reportId },
      select: { community_platform_comment_id: true },
    });
  if (!postReport && !commentReport) {
    throw new HttpException("Report does not target valid content", 404);
  }
  // 7. Begin transaction for atomic operations
  const approval = await MyGlobal.prisma.$transaction(async (tx) => {
    // 7a. Create approval record
    const approvalId = v4();
    const approvalRecord = await tx.community_platform_report_approvals.create({
      data: {
        id: approvalId,
        content_report_id: props.reportId,
        moderator_id: props.admin.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      ...CommunityPlatformReportApprovalTransformer.select(),
    });
    // 7b. Update report status
    await tx.community_platform_content_reports.update({
      where: { id: props.reportId },
      data: { status: "approved", updated_at: new Date() },
    });
    // 7c. Delete reported content
    if (postReport) {
      // Get post details for karma adjustment - without vote_score since column doesn't exist
      const post = await tx.community_platform_posts.findUniqueOrThrow({
        where: { id: postReport.community_platform_post_id },
        select: { community_platform_member_id: true },
      });
      // Soft delete post (cascade deletes comments and votes)
      await tx.community_platform_posts.update({
        where: { id: postReport.community_platform_post_id },
        data: { deleted_at: new Date() },
      });
      // Karma adjustment removed since vote_score column doesn't exist
    } else if (commentReport) {
      // Get comment details for karma adjustment - without vote_score since column doesn't exist
      const comment = await tx.community_platform_comments.findUniqueOrThrow({
        where: { id: commentReport.community_platform_comment_id },
        select: { member_id: true },
      });
      // Soft delete comment (cascade deletes nested replies)
      await tx.community_platform_comments.update({
        where: { id: commentReport.community_platform_comment_id },
        data: { deleted_at: new Date() },
      });
      // Karma adjustment removed since vote_score column doesn't exist
    }
    return approvalRecord;
  });
  // 8. Transform and return approval
  return await CommunityPlatformReportApprovalTransformer.transform(approval);
}
