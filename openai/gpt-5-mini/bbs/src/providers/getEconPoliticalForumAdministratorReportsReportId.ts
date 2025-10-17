import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getEconPoliticalForumAdministratorReportsReportId(props: {
  administrator: AdministratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumReport> {
  const { administrator, reportId } = props;

  // Authorization: ensure the administrator is still active and linked user is valid
  const admin =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
        registereduser: { deleted_at: null, is_banned: false },
      },
    });

  if (!admin) throw new HttpException("Unauthorized", 403);

  // Retrieve report with related context for potential further use
  const report = await MyGlobal.prisma.econ_political_forum_reports.findUnique({
    where: { id: reportId },
    include: {
      reporter: true,
      reportedPost: true,
      reportedThread: true,
      moderator: true,
      moderationCase: true,
    },
  });

  if (!report) throw new HttpException("Not Found", 404);

  // Simple sanitizer: remove <script>...</script> blocks to avoid returning dangerous markup
  const sanitize = (value?: string | null): string | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return value.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );
  };

  const response = {
    id: report.id as string & tags.Format<"uuid">,
    reporter_id:
      report.reporter_id === null
        ? null
        : (report.reporter_id as string & tags.Format<"uuid">),
    reported_post_id:
      report.reported_post_id === null
        ? null
        : (report.reported_post_id as string & tags.Format<"uuid">),
    reported_thread_id:
      report.reported_thread_id === null
        ? null
        : (report.reported_thread_id as string & tags.Format<"uuid">),
    moderator_id:
      report.moderator_id === null
        ? null
        : (report.moderator_id as string & tags.Format<"uuid">),
    moderation_case_id:
      report.moderation_case_id === null
        ? null
        : (report.moderation_case_id as string & tags.Format<"uuid">),
    reason_code: report.reason_code,
    reporter_text: sanitize(report.reporter_text ?? null),
    reporter_anonymous: report.reporter_anonymous,
    status: report.status,
    priority: report.priority,
    created_at: toISOStringSafe(report.created_at),
    triaged_at: report.triaged_at ? toISOStringSafe(report.triaged_at) : null,
    reviewed_at: report.reviewed_at
      ? toISOStringSafe(report.reviewed_at)
      : null,
    resolved_at: report.resolved_at
      ? toISOStringSafe(report.resolved_at)
      : null,
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  } satisfies IEconPoliticalForumReport;

  return response;
}
