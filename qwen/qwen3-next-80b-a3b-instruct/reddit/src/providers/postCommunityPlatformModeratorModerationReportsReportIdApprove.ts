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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";

export async function postCommunityPlatformModeratorModerationReportsReportIdApprove(props: {
  moderator: ModeratorPayload;
  reportId: string;
}): Promise<ICommunityPlatformReport> {
  // Fetch the report with all required relationships
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    include: {
      post: true,
      comment: true,
      reporter: true,
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Validate report status is pending
  if (report.status !== "pending") {
    throw new HttpException("Report has already been processed", 400);
  }
  // Check if target is a comment or post - using target_comment_id as proxy
  if (!report.target_comment_id) {
    throw new HttpException("Target comment ID is required for approval", 400);
  }
  // Validate target comment exists and is not deleted
  const targetComment =
    await MyGlobal.prisma.community_platform_comments.findUnique({
      where: { id: report.target_comment_id },
    });
  if (!targetComment) {
    throw new HttpException("Target comment not found", 404);
  }
  if (targetComment.deleted_at !== null) {
    throw new HttpException("Target comment has already been deleted", 400);
  }
  // Find community of target comment - use community_id field
  const targetCommunity =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: targetComment.community_id },
    });
  if (!targetCommunity) {
    throw new HttpException("Target community not found", 404);
  }
  // Verify moderator is authorized for this community using member_id
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id, // Correct field name
        community: { id: targetCommunity.id },
        deleted_at: null,
      },
    });
  if (!moderator) {
    throw new HttpException(
      "Moderator is not authorized for this community",
      403,
    );
  }
  // Soft-delete the target comment
  await MyGlobal.prisma.community_platform_comments.update({
    where: { id: report.target_comment_id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // Update report - use correct field names for approved_by and approved_at
  await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      approved_by: props.moderator.id, // Correct field name
      approved_at: toISOStringSafe(new Date()), // Correct field name
    },
  });
  // Increment reporter's karma
  await MyGlobal.prisma.community_platform_members.update({
    where: { id: report.reporter_id },
    data: {
      karma: { increment: 1 },
    },
  });
  // Log moderation action - use correct field name for member_id
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      member_id: props.moderator.id, // Correct field name
      action_type: "report_approved",
      target_id: report.target_comment_id,
      target_type: "comment",
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Re-fetch the report to include updated status and relationships
  const updatedReport =
    await MyGlobal.prisma.community_platform_reports.findUnique({
      where: { id: props.reportId },
      include: {
        post: true,
        comment: true,
        reporter: true, // Ensure transformer has all needed data
      },
    });
  // Return approved report with proper transformation using the transformer
  return await CommunityPlatformReportTransformer.transform(updatedReport);
}
