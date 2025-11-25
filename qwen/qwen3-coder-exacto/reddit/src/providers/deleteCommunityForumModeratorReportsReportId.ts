import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityForumModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, check if the report exists
  const existingReport =
    await MyGlobal.prisma.community_forum_reports.findUnique({
      where: {
        id: props.reportId,
      },
      include: {
        community_forum_report_on_posts: true,
        community_forum_report_on_comments: true,
      },
    });

  // If report doesn't exist, throw 404
  if (!existingReport) {
    throw new HttpException("Report not found", 404);
  }

  // Check if the moderator is authorized to delete this report
  // Only the assigned moderator or an admin can delete the report
  if (existingReport.community_forum_moderator_id !== props.moderator.id) {
    // In the current schema, we don't have a direct way to check for admin privileges
    // For now, we'll assume that if the moderator is not assigned, they don't have permission
    // A more robust implementation would check for admin privileges
    throw new HttpException(
      "You do not have permission to delete this report",
      403,
    );
  }

  // Perform the deletion in a transaction to ensure data consistency
  await MyGlobal.prisma.$transaction([
    // Delete related moderation actions
    MyGlobal.prisma.community_forum_moderation_actions.deleteMany({
      where: {
        community_forum_report_id: props.reportId,
      },
    }),
    // Delete related report_on_posts entries
    MyGlobal.prisma.community_forum_report_on_posts.deleteMany({
      where: {
        community_forum_report_id: props.reportId,
      },
    }),
    // Delete related report_on_comments entries
    MyGlobal.prisma.community_forum_report_on_comments.deleteMany({
      where: {
        community_forum_report_id: props.reportId,
      },
    }),
    // Delete the main report
    MyGlobal.prisma.community_forum_reports.delete({
      where: {
        id: props.reportId,
      },
    }),
  ]);

  // Return nothing as per the specification
  return;
}
