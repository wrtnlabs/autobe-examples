import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
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

export async function patchRedditPlatformAdminReportsReportIdApprove(props: {
  admin: AdminPayload;
  reportId: string;
  body: IRedditPlatformReport.IApproval;
}): Promise<IRedditPlatformReport.IResolution> {
  // Validate report exists and is not already resolved
  const report = await MyGlobal.prisma.reddit_platform_reports.findFirst({
    where: {
      id: props.reportId,
      status: {
        notIn: ["approved", "rejected"],
      },
    },
  });
  if (!report) {
    throw new HttpException("Report not found or already resolved", 404);
  }
  // Approve the report
  const updatedReport = await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      resolved_by_id: props.admin.id,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return resolved report with proper type conversion
  return {
    id: updatedReport.id,
    status: updatedReport.status,
    resolved_by_id: updatedReport.resolved_by_id,
    resolved_at: updatedReport.updated_at,
  } as IRedditPlatformReport.IResolution;
}
