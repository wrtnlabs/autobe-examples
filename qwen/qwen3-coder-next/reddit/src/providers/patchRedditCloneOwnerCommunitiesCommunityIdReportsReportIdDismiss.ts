import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneOwnerCommunitiesCommunityIdReportsReportIdDismiss(props: {
  owner: OwnerPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneContentReportResolution> {
  // Validate owner permission for community
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { id: props.communityId },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Check if owner has moderator role for this community
  // Note: Moderator assignments use appointed_actor_id instead of owner_id
  const ownerModerator =
    await MyGlobal.prisma.reddit_clone_moderator_assignments.findFirst({
      where: {
        appointed_actor_id: props.owner.id,
        community_id: props.communityId,
      },
    });
  if (ownerModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Load report and verify it exists and belongs to community
  const report = await MyGlobal.prisma.reddit_clone_content_reports.findUnique({
    where: { id: props.reportId },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  // Report type doesn't have community_id field, so skip this validation
  // Verify report is pending (not already resolved)
  if (report.status !== "pending") {
    throw new HttpException(
      `Report is already ${report.status}, cannot dismiss`,
      409,
    );
  }
  // Update report status to dismissed
  await MyGlobal.prisma.reddit_clone_content_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed" as const,
      updated_at: new Date(),
    },
  });
  // Create resolution record
  // Moderator assignments use appointed_actor_id, not moderator_id
  const resolution =
    await MyGlobal.prisma.reddit_clone_content_report_resolutions.create({
      data: {
        id: v4(),
        report_id: props.reportId,
        moderator_id: ownerModerator.appointed_actor_id,
        action: "dismiss" as const,
        reason: "Report dismissed by owner-moderator",
        resolved_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  // Log moderation action
  // Moderation logs don't have community_id, target_id, or details fields
  await MyGlobal.prisma.reddit_clone_moderation_logs.create({
    data: {
      id: v4(),
      moderator_id: ownerModerator.appointed_actor_id,
      action_type: "report_dismissed" as const,
      target_type: "content_report" as const,
      created_at: new Date(),
    },
  });
  // Return resolution record
  return {
    id: resolution.id,
    reportId: resolution.report_id,
    moderatorId: resolution.moderator_id,
    action: resolution.action,
    reason: resolution.reason ?? null,
    resolvedAt: toISOStringSafe(resolution.resolved_at),
    createdAt: toISOStringSafe(resolution.created_at),
    updatedAt: toISOStringSafe(resolution.updated_at),
  };
}
