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

export async function patchRedditCloneOwnerCommunitiesCommunityIdReportsReportIdApprove(props: {
  owner: OwnerPayload;
  communityId: string;
  reportId: string;
}): Promise<IRedditCloneContentReportResolution> {
  // Verify owner has access to community via ownership record
  const owner = await MyGlobal.prisma.reddit_clone_owners.findUniqueOrThrow({
    where: { id: props.owner.id },
    select: {
      redditCloneCommunityOwner: {
        where: {
          community: {
            id: props.communityId,
          },
        },
      },
    },
  });
  // Load report with status and content info
  const report =
    await MyGlobal.prisma.reddit_clone_content_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        report_type: true,
        post_id: true,
        status: true,
        comment_id: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Check report is in pending status
  if (report.status !== "pending") {
    throw new HttpException(
      `Report ${report.id} is not in pending status`,
      400,
    );
  }
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  // Delete the reported content based on report_type
  if (report.report_type === "post") {
    await MyGlobal.prisma.reddit_clone_content_posts.delete({
      where: { id: report.post_id as string },
    });
  } else if (report.report_type === "comment") {
    await MyGlobal.prisma.reddit_clone_content_comments.delete({
      where: { id: report.comment_id as string },
    });
  } else {
    throw new HttpException(`Unknown report_type: ${report.report_type}`, 500);
  }
  // Update report status and set resolvedByModerator
  await MyGlobal.prisma.reddit_clone_content_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      resolvedByModerator: {
        connect: {
          id: props.owner.id,
        },
      },
      updated_at: now,
    },
  });
  // Create resolution record
  const resolutionId = v4() as string & tags.Format<"uuid">;
  const resolution =
    await MyGlobal.prisma.reddit_clone_content_report_resolutions.create({
      data: {
        id: resolutionId,
        report_id: props.reportId,
        moderator_id: props.owner.id,
        action: "approve",
        reason: null,
        resolved_at: now,
        created_at: now,
        updated_at: now,
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
  return {
    id: resolution.id,
    reportId: resolution.report_id,
    moderatorId: resolution.moderator_id,
    action: resolution.action,
    reason: resolution.reason ?? null,
    resolvedAt: resolution.resolved_at.toISOString() as string &
      tags.Format<"date-time">,
    createdAt: resolution.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updatedAt: resolution.updated_at.toISOString() as string &
      tags.Format<"date-time">,
  };
}
