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

export async function deleteRedditPlatformAdminRedditPlatformReportsReportId(props: {
  admin: AdminPayload;
  reportId: string;
}): Promise<IRedditPlatformReport.IRemove> {
  const report = await MyGlobal.prisma.reddit_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: "removed",
      resolved_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      resolved_by_id: props.admin.id,
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  return {
    id: report.id,
    resolvedAt: report.resolved_at ? toISOStringSafe(report.resolved_at) : null,
  };
}
