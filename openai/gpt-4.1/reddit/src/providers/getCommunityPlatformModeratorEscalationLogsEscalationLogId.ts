import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEscalationLog";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorEscalationLogsEscalationLogId(props: {
  moderator: ModeratorPayload;
  escalationLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformEscalationLog> {
  // 1. Retrieve escalation log
  const escalationLog =
    await MyGlobal.prisma.community_platform_escalation_logs.findUnique({
      where: { id: props.escalationLogId },
    });
  if (!escalationLog) {
    throw new HttpException("Escalation log not found", 404);
  }

  // 2. Retrieve associated report
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: escalationLog.report_id },
    select: { post_id: true, comment_id: true },
  });
  if (!report) {
    throw new HttpException("Associated report not found", 500);
  }

  // 3. Determine community via post_id (reports always relate to post or comment)
  let communityId: string | undefined;
  if (report.post_id) {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: report.post_id },
      select: { community_platform_community_id: true },
    });
    if (post) communityId = post.community_platform_community_id;
  }
  // Optionally: If relevant, can implement comment-based lookup as well
  // else if (report.comment_id) { ... }
  if (!communityId) {
    throw new HttpException(
      "Unable to determine community for assignment check",
      500,
    );
  }

  // 4. Verify moderator assignment to the community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: communityId,
        status: "active",
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "Forbidden: Moderator not assigned to this community",
      403,
    );
  }

  // 5. Build response strictly matching interface
  return {
    id: escalationLog.id,
    initiator_id: escalationLog.initiator_id,
    destination_admin_id: escalationLog.destination_admin_id ?? undefined,
    report_id: escalationLog.report_id,
    escalation_reason: escalationLog.escalation_reason,
    status: escalationLog.status,
    resolution_summary: escalationLog.resolution_summary ?? undefined,
    created_at: toISOStringSafe(escalationLog.created_at),
    updated_at: toISOStringSafe(escalationLog.updated_at),
  };
}
