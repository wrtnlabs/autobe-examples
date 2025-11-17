import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityForumModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityForumCommunityReport> {
  // Find the report by ID
  const report = await MyGlobal.prisma.community_forum_reports.findUnique({
    where: {
      id: props.reportId,
    },
  });

  // If report doesn't exist, throw 404
  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  // Return the report with proper type conversions
  return {
    id: report.id,
    community_forum_user_id: report.community_forum_user_id,
    community_forum_moderator_id:
      report.community_forum_moderator_id ?? undefined,
    actor_type: report.actor_type,
    reason: report.reason,
    description: report.description,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
  };
}
