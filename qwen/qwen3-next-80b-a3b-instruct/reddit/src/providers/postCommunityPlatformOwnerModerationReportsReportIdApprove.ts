import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";

export async function postCommunityPlatformOwnerModerationReportsReportIdApprove(props: {
  owner: OwnerPayload;
  reportId: string;
}): Promise<ICommunityPlatformReport> {
  // Find the report
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    include: { reporter: true, comment: true },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Verify report status is pending
  if (report.status !== "pending") {
    throw new HttpException("Report has already been processed.", 400);
  }
  // Validate target exists and is not already deleted
  if (report.target_comment_id) {
    const targetComment =
      await MyGlobal.prisma.community_platform_comments.findUnique({
        where: { id: report.target_comment_id },
      });
    if (!targetComment) {
      throw new HttpException("Target comment not found", 404);
    }
    if (targetComment.deleted_at !== null) {
      throw new HttpException("Target comment already deleted", 400);
    }
    // Soft-delete the target comment
    await MyGlobal.prisma.community_platform_comments.update({
      where: { id: report.target_comment_id },
      data: { deleted_at: toISOStringSafe(new Date()) },
    });
  }
  // Update report status to approved
  const updatedReport = await MyGlobal.prisma.community_platform_reports.update(
    {
      where: { id: props.reportId },
      data: {
        status: "approved",
        approvedBy: props.owner.id,
        approvedAt: toISOStringSafe(new Date()),
      },
      include: { reporter: true },
    },
  );
  // Increment reporter karma by 1
  await MyGlobal.prisma.community_platform_members.update({
    where: { id: report.reporter_id },
    data: { karma: { increment: 1 } },
  });
  // Log moderation action
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      action_type: "report_approved",
      target_id: report.target_comment_id,
      targetType: report.target_comment_id ? "comment" : "post",
      moderator_id: props.owner.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Return updated report
  return {
    id: updatedReport.id,
    reporter_id: updatedReport.reporter_id,
    target_comment_id: updatedReport.target_comment_id,
  };
}
