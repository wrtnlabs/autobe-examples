import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string;
}): Promise<ICommunityReport> {
  // Validate UUID format
  if (!typia.is<string & tags.Format<"uuid">>(props.reportId)) {
    throw new HttpException("Invalid report ID format", 400);
  }
  // Query database for report
  const report = await MyGlobal.prisma.community_reports.findUnique({
    where: { id: props.reportId },
  });
  // Return 404 if not found
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Return the report with proper date conversion
  return {
    id: report.id,
    reporter_id: report.reporter_id,
    reported_content_id: report.reported_content_id,
    content_type: report.content_type,
    reason: report.reason,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    status: report.status,
  };
}
