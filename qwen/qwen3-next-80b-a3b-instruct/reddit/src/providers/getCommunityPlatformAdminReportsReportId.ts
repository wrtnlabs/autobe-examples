import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
      },
    });

  return {
    id: report.id,
    created_at: toISOStringSafe(report.created_at),
    status: report.status,
    updated_at: toISOStringSafe(report.updated_at),
    reported_content_id:
      report.reported_content_id !== null
        ? (report.reported_content_id satisfies string as string &
            tags.Format<"uuid">)
        : undefined,
    reported_comment_id:
      report.reported_comment_id !== null
        ? (report.reported_comment_id satisfies string as string &
            tags.Format<"uuid">)
        : undefined,
    reporter_id: report.reporter_id,
    target_type: report.target_type,
    report_reason: report.report_reason,
    report_notes:
      report.report_notes !== null
        ? (report.report_notes satisfies string as string)
        : undefined,
  };
}
