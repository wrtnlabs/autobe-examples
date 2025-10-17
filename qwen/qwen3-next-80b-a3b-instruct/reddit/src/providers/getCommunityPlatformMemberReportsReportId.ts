import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
      },
    });

  // Verify that the reporter is the authenticated member
  if (report.reporter_id !== props.member.id) {
    throw new HttpException(
      "Unauthorized: You can only view reports you submitted",
      403,
    );
  }

  return {
    id: report.id,
    reported_content_id: (report.reported_content_id ?? undefined) satisfies
      | string
      | undefined as string | undefined,
    reported_comment_id: (report.reported_comment_id ?? undefined) satisfies
      | string
      | undefined as string | undefined,
    reporter_id: report.reporter_id,
    target_type: report.target_type,
    status: report.status,
    report_reason: report.report_reason,
    report_notes: report.report_notes ?? undefined,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
  };
}
