import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
    });

  return {
    id: report.id,
    reporter_guest_id: report.reporter_guest_id ?? undefined,
    reporter_member_id: report.reporter_member_id ?? undefined,
    reported_post_id: report.reported_post_id ?? undefined,
    reported_comment_id: report.reported_comment_id ?? undefined,
    reported_member_id: report.reported_member_id ?? undefined,
    status_id: report.status_id,
    category: report.category,
    description: report.description ?? null,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
  };
}
