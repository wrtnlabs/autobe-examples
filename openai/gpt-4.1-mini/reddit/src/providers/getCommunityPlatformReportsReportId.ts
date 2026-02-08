import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformReportsReportId(props: {
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const record = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!record) {
    throw new HttpException("Report not found", 404);
  }
  return {
    id: record.id,
    reporting_user_id: record.community_platform_user_id,
    report_reason_id: record.community_platform_report_reason_id,
    description: record.description,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
