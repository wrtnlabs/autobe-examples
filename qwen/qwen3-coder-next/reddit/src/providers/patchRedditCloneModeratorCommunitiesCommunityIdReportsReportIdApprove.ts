import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReportResolution";
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

export async function patchRedditCloneModeratorCommunitiesCommunityIdReportsReportIdApprove(props: {
  moderator: ModeratorPayload;
  communityId: string;
  reportId: string;
  body: IRedditCloneContentReportResolution.IRequest;
}): Promise<IRedditCloneContentReportResolution> {
  // Start transaction to ensure atomicity
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Verify moderator has permissions for the community
    const assignment = await tx.reddit_clone_moderator_assignments.findFirst({
      where: {
        community_id: props.communityId,
        appointed_actor_id: props.moderator.id,
        role: { in: ["owner", "moderator"] },
        status: "active",
      },
      select: { id: true, role: true },
    });
    if (assignment === null) {
      throw new HttpException("Forbidden", 403);
    }
    // 2. Load the report and verify it exists and is pending
    const report = await tx.reddit_clone_content_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        report_type: true,
        post_id: true,
        comment_id: true,
        status: true,
      },
    });
    if (report.status !== "pending") {
      throw new HttpException("Report already resolved", 400);
    }
    // 3. Load and delete the reported content based on report_type
    if (report.report_type === "post" && report.post_id !== null) {
      // Delete the reported post
      await tx.reddit_clone_content_posts.delete({
        where: { id: report.post_id },
      });
    } else if (report.report_type === "comment" && report.comment_id !== null) {
      // Delete the reported comment
      await tx.reddit_clone_content_comments.delete({
        where: { id: report.comment_id },
      });
    } else {
      throw new HttpException("Invalid report type", 400);
    }
    // 4. Update the report status to approved
    await tx.reddit_clone_content_reports.update({
      where: { id: report.id },
      data: {
        status: "approved",
        report_resolved_by_moderator_id: assignment.id,
      },
    });
    // 5. Create resolution record
    const resolvedAt = toISOStringSafe(new Date());
    const createdAt = toISOStringSafe(new Date());
    const updatedAt = toISOStringSafe(new Date());
    const resolution = await tx.reddit_clone_content_report_resolutions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        report_id: report.id,
        moderator_id: assignment.id,
        action: "approve",
        reason: props.body.reason ?? "",
        resolved_at: resolvedAt,
        created_at: createdAt,
        updated_at: updatedAt,
      },
      select: {
        id: true,
        report_id: true,
        moderator_id: true,
        action: true,
        reason: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
      },
    });
    return resolution;
  });
  // 6. Transform the resolution record to return as response
  return {
    id: result.id,
    reportId: result.report_id,
    moderatorId: result.moderator_id,
    action: result.action,
    reason: result.reason ?? null,
    resolvedAt: toISOStringSafe(result.resolved_at),
    createdAt: toISOStringSafe(result.created_at),
    updatedAt: toISOStringSafe(result.updated_at),
  };
}
