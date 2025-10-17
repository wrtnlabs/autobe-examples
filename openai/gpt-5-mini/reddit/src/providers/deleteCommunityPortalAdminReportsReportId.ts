import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPortalAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, reportId } = props;

  // Authorization: ensure the admin account is enrolled and active
  const adminRecord = await MyGlobal.prisma.community_portal_admins.findFirst({
    where: {
      user_id: admin.id,
      is_active: true,
      user: { deleted_at: null },
    },
  });

  if (!adminRecord)
    throw new HttpException("Unauthorized: admin not found or inactive", 403);

  // Verify the report exists
  const report = await MyGlobal.prisma.community_portal_reports.findUnique({
    where: { id: reportId },
  });
  if (!report) throw new HttpException("Not Found", 404);

  // Access environment flags defensively (cast via unknown to avoid structural type errors)
  const env = MyGlobal.env as unknown as Record<string, string | undefined>;

  // Legal hold check
  if (env["REPORT_LEGAL_HOLD"] === "true") {
    throw new HttpException("Conflict: legal hold prevents deletion", 409);
  }

  // Retention policy check (days)
  const retentionDays = Number(env["REPORT_RETENTION_DAYS"] ?? 0);
  if (retentionDays > 0) {
    const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const createdAtMs = report.created_at
      ? new Date(report.created_at).getTime()
      : NaN;
    if (!Number.isNaN(createdAtMs) && createdAtMs >= cutoffMs) {
      throw new HttpException(
        "Conflict: report is within retention period and cannot be deleted",
        409,
      );
    }
  }

  // Prepare audit entry
  const deletionTimestamp = toISOStringSafe(new Date());
  const originalCreatedAt = toISOStringSafe(report.created_at);
  const auditId = v4() as string & tags.Format<"uuid">;

  const auditDetails = {
    reason: "Administrative hard-delete",
    original_report_status: report.status,
    original_created_at: originalCreatedAt,
  };

  // Best-effort: persist audit entry. If audit table is missing, log and continue.
  try {
    await MyGlobal.prisma.$executeRawUnsafe(
      `INSERT INTO deletion_audits (id, target_table, target_id, actor_user_id, action, details, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      auditId,
      "community_portal_reports",
      reportId,
      admin.id,
      "hard_delete",
      JSON.stringify(auditDetails),
      deletionTimestamp,
    );
  } catch (err) {
    // Don't block deletion on audit failure
    // eslint-disable-next-line no-console
    console.warn("Audit persistence failed; proceeding with hard delete.", {
      auditId,
      reportId,
      err,
    });
  }

  // Perform hard delete
  await MyGlobal.prisma.community_portal_reports.delete({
    where: { id: reportId },
  });

  return;
}
