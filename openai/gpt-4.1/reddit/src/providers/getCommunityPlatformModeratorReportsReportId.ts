import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      reporting_member_id: true,
      post_id: true,
      comment_id: true,
      report_category_id: true,
      reason_text: true,
      status: true,
      moderation_result: true,
      moderated_by_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  return {
    id: report.id,
    reporting_member_id: report.reporting_member_id,
    post_id: report.post_id ?? undefined,
    comment_id: report.comment_id ?? undefined,
    report_category_id: report.report_category_id,
    reason_text: report.reason_text ?? undefined,
    status: report.status,
    moderation_result: report.moderation_result ?? undefined,
    moderated_by_id: report.moderated_by_id ?? undefined,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
  };
}
