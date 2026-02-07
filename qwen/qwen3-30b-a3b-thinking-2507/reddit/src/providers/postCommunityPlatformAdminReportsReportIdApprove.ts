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
}): Promise<void> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: { status: "approved" },
  });
  const now = toISOStringSafe(new Date());
  if (report.reported_content_type === "post") {
    await MyGlobal.prisma.community_platform_posts.update({
      where: { id: report.reported_content_id },
      data: { deleted_at: now },
    });
  } else if (report.reported_content_type === "comment") {
    await MyGlobal.prisma.community_platform_comments.update({
      where: { id: report.reported_content_id },
      data: { deleted_at: now },
    });
  }
  await MyGlobal.prisma.community_platform_moderation_reports_resolutions.create(
    {
      data: {
        report: { connect: { id: props.reportId } },
        moderator: { connect: { id: props.admin.id } },
        action: "approved",
        resolution_timestamp: now,
      },
    },
  );
}
