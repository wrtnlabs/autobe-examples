import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminContentReportsContentReportId(props: {
  admin: AdminPayload;
  contentReportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityContentReport> {
  const { contentReportId } = props;

  const report =
    await MyGlobal.prisma.reddit_community_content_reports.findUniqueOrThrow({
      where: { id: contentReportId },
    });

  return {
    id: report.id,
    reporter_id: report.reporter_id,
    content_id: report.content_id,
    report_reason_id: report.report_reason_id,
    report_status_id: report.report_status_id,
    content_type: report.content_type as "post" | "comment",
    additional_details:
      report.additional_details === null
        ? null
        : (report.additional_details ?? undefined),
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
