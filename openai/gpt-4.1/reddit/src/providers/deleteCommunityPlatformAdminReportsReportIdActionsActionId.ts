import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminReportsReportIdActionsActionId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  actionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify report exists and is not soft deleted
  const report = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  // Step 2: Verify report action exists and is associated with the report
  const action =
    await MyGlobal.prisma.community_platform_report_actions.findFirst({
      where: {
        id: props.actionId,
        report_id: props.reportId,
      },
    });
  if (!action) {
    throw new HttpException("Report action not found", 404);
  }

  // Step 3: Hard delete the action (no soft delete field exists)
  await MyGlobal.prisma.community_platform_report_actions.delete({
    where: { id: props.actionId },
  });
}
