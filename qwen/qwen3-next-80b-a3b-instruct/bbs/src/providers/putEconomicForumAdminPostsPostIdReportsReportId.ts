import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putEconomicForumAdminPostsPostIdReportsReportId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IEconomicForumPostReport.IUpdate;
}): Promise<IEconomicForumPostReport> {
  // Verify report exists and belongs to the post
  const report = await MyGlobal.prisma.economic_forum_post_reports.findUnique({
    where: {
      id: props.reportId,
      reported_post_id: props.postId,
    },
  });
  if (!report) {
    throw new HttpException("Post report not found", 404);
  }
  // Extract body from props
  const { status } = props.body;
  // Prepare update data with strict typing
  const updateData: Prisma.economic_forum_post_reportsUpdateInput = {
    status,
  };
  // Update the report
  const updated = await MyGlobal.prisma.economic_forum_post_reports.update({
    where: {
      id: props.reportId,
    },
    data: updateData,
  });
  // Create audit log entry
  await MyGlobal.prisma.economic_forum_system_audits.create({
    data: {
      id: v4(),
      admin: { connect: { id: props.admin.id } },
      action: "MODERATION_UPDATE",
      target_type: "POST_REPORT",
      target_id: props.reportId,
      details: JSON.stringify({
        status: props.body.status,
        previous_status: report.status,
      }),
      occurred_at: toISOStringSafe(new Date()),
    },
  });
  // Return updated report with strict typing
  // resolved_at is not present in the Prisma return type - safe to return null per interface contract
  return {
    id: updated.id,
    status: updated.status,
    resolved_at: null,
  };
}
