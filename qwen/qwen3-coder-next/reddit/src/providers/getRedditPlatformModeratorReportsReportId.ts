import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string;
}): Promise<IRedditPlatformReport> {
  const report = await MyGlobal.prisma.reddit_platform_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      reporter_id: true,
      resolved_by_id: true,
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!report) throw new HttpException("Report not found", 404);
  return {
    id: report.id,
    reporter_id: report.reporter_id,
    resolved_by_id: report.resolved_by_id,
    target_type: report.target_type,
    target_id: report.target_id,
    reason: report.reason,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    reporter: undefined,
    resolver: undefined,
  };
}
