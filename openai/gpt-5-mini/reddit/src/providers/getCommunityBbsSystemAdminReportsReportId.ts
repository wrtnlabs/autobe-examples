import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function getCommunityBbsSystemAdminReportsReportId(props: {
  systemAdmin: SystemadminPayload;
  reportId: string & tags.Format<"uuid">;
  includeAttachments: string;
}): Promise<ICommunityBbsReport> {
  const { systemAdmin, reportId, includeAttachments } = props;

  // Retrieve the report; include attachments metadata when explicitly requested
  const report = await MyGlobal.prisma.community_bbs_reports.findUnique({
    where: { id: reportId },
    include:
      includeAttachments === "true"
        ? {
            community_bbs_report_attachments: {
              select: {
                id: true,
                href: true,
                mime_type: true,
                size_bytes: true,
                created_at: true,
              },
            },
          }
        : undefined,
  });

  if (!report) {
    throw new HttpException("Not Found", 404);
  }

  // Log access for compliance/audit purposes
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "system_admin",
      actor_id: systemAdmin.id,
      entity: "report",
      action: "view",
      payload: JSON.stringify({ reportId, includeAttachments }),
      created_at: now,
      updated_at: now,
    },
  });

  // Map database record to DTO, carefully handling nullability and date conversions
  return {
    id: report.id as string & tags.Format<"uuid">,
    reporter_id:
      report.reporter_id === null
        ? null
        : (report.reporter_id as string & tags.Format<"uuid">),
    target_type: report.target_type as
      | "post"
      | "comment"
      | "community"
      | "user",
    target_id: report.target_id as string & tags.Format<"uuid">,
    reason_code: report.reason_code as
      | "spam"
      | "harassment"
      | "copyright"
      | "illegal"
      | "other",
    explanation: report.explanation ?? null,
    evidence_count: report.evidence_count,
    priority: report.priority as "low" | "medium" | "high" | "critical",
    status: report.status as "open" | "in_review" | "resolved" | "dismissed",
    handled_by_actor_type:
      report.handled_by_actor_type === null
        ? null
        : typia.assert<"community_moderator" | "system_admin" | "automation">(
            report.handled_by_actor_type,
          ),
    handled_by_actor_id:
      report.handled_by_actor_id === null
        ? null
        : (report.handled_by_actor_id as string & tags.Format<"uuid">),
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    resolved_at: report.resolved_at
      ? toISOStringSafe(report.resolved_at)
      : null,
  };
}
