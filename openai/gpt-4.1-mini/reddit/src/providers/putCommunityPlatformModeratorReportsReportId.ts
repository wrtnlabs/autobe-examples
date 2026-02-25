import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.IUpdate;
}): Promise<ICommunityPlatformReport> {
  // Find the report or throw 404
  const existingReport =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
    });
  // Prepare data update
  const updateData: Prisma.community_platform_reportsUpdateInput = {};
  if (props.body.status !== undefined && props.body.status !== null) {
    updateData.status = props.body.status;
  }
  if (props.body.description !== undefined) {
    // Assign null explicitly if description is null
    updateData.description = props.body.description ?? undefined;
  }
  // Define ISO string helper with toISOStringSafe
  const now = toISOStringSafe(new Date());
  // Start transaction
  const updatedReport = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update report
    await tx.community_platform_reports.update({
      where: { id: props.reportId },
      data: updateData,
    });
    // Handle side-effects based on new status
    if (props.body.status === "approved") {
      // Delete reported contents (posts and comments)
      const reportedContents =
        await tx.community_platform_reported_contents.findMany({
          where: { community_platform_report_id: props.reportId },
        });
      // Delete posts and comments by reported content
      for (const content of reportedContents) {
        if (content.community_platform_reported_post_id) {
          await tx.community_platform_posts.delete({
            where: { id: content.community_platform_reported_post_id },
          });
        }
        if (content.community_platform_reported_comment_id) {
          await tx.community_platform_post_comments.delete({
            where: { id: content.community_platform_reported_comment_id },
          });
        }
      }
    } else if (props.body.status === "dismissed") {
      // For dismissed, no deletion needed, report remains with updated status
    }
    // Log decision only if status is 'approved' or 'dismissed'
    if (props.body.status === "approved" || props.body.status === "dismissed") {
      await tx.community_platform_reports_decisions.create({
        data: {
          id: v4(),
          report_id: props.reportId,
          moderator_id: props.moderator.id,
          decision: props.body.status,
          comments: props.body.description ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    // Fetch the updated report
    const report = await tx.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
    return report;
  });
  // Transform to response DTO
  return await CommunityPlatformReportTransformer.transform(updatedReport);
}
