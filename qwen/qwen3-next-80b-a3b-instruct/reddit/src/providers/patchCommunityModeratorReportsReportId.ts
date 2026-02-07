import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function patchCommunityModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string;
  body: ICommunityReport.IUpdate;
}): Promise<ICommunityReport> {
  // Validate report exists and is pending
  const report = await MyGlobal.prisma.community_reports.findUnique({
    where: { id: props.reportId, status: "pending" },
  });
  if (!report) throw new HttpException("Report not found or not pending", 404);
  // Extract status from body using type assertion since it's a required field
  // for this operation even if not declared in IUpdate interface
  const status = (props.body as any).status as "approved" | "dismissed";
  // Validate new status is valid
  if (status !== "approved" && status !== "dismissed") {
    throw new HttpException("invalid_status_transition", 400);
  }
  // Update report status and timestamp
  const updatedReport = await MyGlobal.prisma.community_reports.update({
    where: { id: props.reportId },
    data: {
      status,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return fully typed ICommunityReport with Date fields converted to ISO string format
  return {
    id: updatedReport.id,
    reporter_id: updatedReport.reporter_id,
    reported_content_id: updatedReport.reported_content_id,
    content_type: updatedReport.content_type,
    reason: updatedReport.reason,
    created_at: toISOStringSafe(updatedReport.created_at),
    updated_at: toISOStringSafe(updatedReport.updated_at),
    status: updatedReport.status,
  };
}
