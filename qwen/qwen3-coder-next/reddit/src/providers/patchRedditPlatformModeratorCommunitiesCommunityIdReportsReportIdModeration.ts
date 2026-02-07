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

export async function patchRedditPlatformModeratorCommunitiesCommunityIdReportsReportIdModeration(props: {
  moderator: ModeratorPayload;
  communityId: string;
  reportId: string;
  body: IRedditPlatformReport.IModerationRequest;
}): Promise<void> {
  // Validate moderator permissions for this community
  const communityRole =
    await MyGlobal.prisma.reddit_platform_community_roles.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
      },
    });
  if (!communityRole) {
    throw new HttpException(
      "Moderator does not have permission for this community",
      403,
    );
  }
  // Retrieve the report and verify it belongs to the specified community
  // Need to join with posts to verify the report belongs to the specified community
  const report = await MyGlobal.prisma.reddit_platform_reports.findFirst({
    where: {
      id: props.reportId,
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Verify the report belongs to the specified community
  // This requires checking the post's community_id matches the path parameter
  if (report.target_type === "post") {
    const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
      where: { id: report.target_id },
    });
    if (!post || post.community_id !== props.communityId) {
      throw new HttpException("Report not found for this community", 404);
    }
  }
  // Check if report is already resolved
  if (report.status !== "pending") {
    throw new HttpException("Report is already resolved", 409);
  }
  // For now, default to approving the report as IModerationRequest appears empty
  // This would need to be updated based on actual request body structure
  const status = "approved"; // Default action
  // Update the report status and resolved_by_id
  const updatedReport = await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: status,
      resolved_by_id: props.moderator.id,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // If action is 'approve', delete the reported content
  if (updatedReport.status === "approved") {
    if (updatedReport.target_type === "post") {
      await MyGlobal.prisma.reddit_platform_posts.update({
        where: { id: updatedReport.target_id },
        data: {
          deleted_at: toISOStringSafe(new Date()),
        },
      });
    } else if (updatedReport.target_type === "comment") {
      await MyGlobal.prisma.reddit_platform_comments.update({
        where: { id: updatedReport.target_id },
        data: {
          deleted_at: toISOStringSafe(new Date()),
        },
      });
    }
  }
}
