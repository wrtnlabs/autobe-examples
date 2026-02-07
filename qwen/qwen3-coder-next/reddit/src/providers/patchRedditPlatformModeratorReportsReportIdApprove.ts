import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformModeratorReportsReportIdApprove(props: {
  moderator: ModeratorPayload;
  reportId: string;
  body: IRedditPlatformReport.IApproval;
}): Promise<IRedditPlatformReport.IResolution> {
  // Find the report by ID
  const report = await MyGlobal.prisma.reddit_platform_reports.findUnique({
    where: { id: props.reportId },
    include: {
      reporter: true,
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Check if the requesting moderator has appropriate authorization
  // Verify the moderator has permission to moderate the community
  let communityId: string | undefined = undefined;
  if (report.target_type === "post") {
    const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
      where: { id: report.target_id },
    });
    communityId = post?.community_id ?? undefined;
  } else if (report.target_type === "comment") {
    const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
      where: { id: report.target_id },
    });
    if (comment?.post_id) {
      const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
        where: { id: comment.post_id },
      });
      communityId = post?.community_id ?? undefined;
    }
  }
  // Check if the moderator has appropriate permissions in the community
  // Note: The schema uses 'user_id' not 'moderator_id'
  const moderatorCommunity =
    await MyGlobal.prisma.reddit_platform_community_roles.findFirst({
      where: {
        user_id: props.moderator.id, // Fixed: use 'user_id' instead of 'moderator_id'
        community_id: communityId,
      },
    });
  if (!moderatorCommunity) {
    throw new HttpException("Forbidden", 403);
  }
  // Load the reported content based on target_type
  let contentRecord = null;
  if (report.target_type === "post") {
    contentRecord = await MyGlobal.prisma.reddit_platform_posts.findUnique({
      where: { id: report.target_id },
    });
  } else if (report.target_type === "comment") {
    contentRecord = await MyGlobal.prisma.reddit_platform_comments.findUnique({
      where: { id: report.target_id },
    });
  }
  if (!contentRecord) {
    throw new HttpException("Reported content not found", 404);
  }
  // Delete the content with proper cascade
  if (report.target_type === "post") {
    await MyGlobal.prisma.reddit_platform_posts.delete({
      where: { id: report.target_id },
    });
  } else if (report.target_type === "comment") {
    await MyGlobal.prisma.reddit_platform_comments.delete({
      where: { id: report.target_id },
    });
  }
  // Update the report status to 'approved' with resolution timestamp
  const updatedReport = await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      updated_at: new Date().toISOString(),
      resolved_by_id: props.moderator.id,
    },
  });
  // Return the updated report with resolution details
  return {
    id: updatedReport.id,
    reporter_id: updatedReport.reporter_id,
    resolved_by_id: updatedReport.resolved_by_id,
    target_type: updatedReport.target_type,
    target_id: updatedReport.target_id,
    reason: updatedReport.reason,
    status: updatedReport.status,
    created_at: updatedReport.created_at.toISOString(),
    updated_at: updatedReport.updated_at.toISOString(),
  };
}
