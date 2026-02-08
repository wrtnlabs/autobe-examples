import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportCollector } from "../collectors/CommunityPlatformReportCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformReports(props: {
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  // Access IDs via type cast to any to fix TS errors
  const userId = (props.body as any).community_platform_user_id;
  const reportReasonId = (props.body as any)
    .community_platform_report_reason_id;
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: userId },
  });
  if (!user) throw new HttpException("User not found", 404);
  const reason =
    await MyGlobal.prisma.community_platform_report_reasons.findUnique({
      where: { id: reportReasonId },
    });
  if (!reason) throw new HttpException("Report reason not found", 404);
  const data = await CommunityPlatformReportCollector.collect({
    body: props.body,
    user,
    reportReason: reason,
  });
  const created = await MyGlobal.prisma.community_platform_reports.create({
    data,
  });
  return {
    id: created.id,
    community_platform_user_id: created.community_platform_user_id,
    community_platform_report_reason_id:
      created.community_platform_report_reason_id,
    description: created.description,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
