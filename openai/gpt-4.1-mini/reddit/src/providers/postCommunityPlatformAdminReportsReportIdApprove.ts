import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminReportsReportIdApprove(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  // Check if the report exists
  const existingReport =
    await MyGlobal.prisma.community_platform_reports.findUnique({
      where: { id: props.reportId },
    });
  if (existingReport === null) {
    throw new HttpException("Report not found", 404);
  }
  // Authorization check for admin is implicit by the admin payload
  // Proceed to update status to 'approved'
  const updatedReport = await MyGlobal.prisma.community_platform_reports.update(
    {
      where: { id: props.reportId },
      data: { status: "approved" },
    },
  );
  // Create decision record for approval
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const decisionId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.community_platform_reports_decisions.create({
    data: {
      id: decisionId,
      report_id: props.reportId,
      moderator_id: props.admin.id,
      created_at: now,
      updated_at: now,
      decision: "approved",
    },
  });
  return updatedReport;
}
