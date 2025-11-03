import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get the target report (to verify existence and for 404 case)
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  // Delete all linked report actions records (0+): actions must go before report
  await MyGlobal.prisma.community_platform_report_actions.deleteMany({
    where: { report_id: props.reportId },
  });

  // Delete linked moderation link (1:0..1 post, 1:0..1 comment link): first posts, then comments, as both are optional
  await MyGlobal.prisma.community_platform_report_of_posts.deleteMany({
    where: { report_id: props.reportId },
  });
  await MyGlobal.prisma.community_platform_report_of_comments.deleteMany({
    where: { report_id: props.reportId },
  });

  // Delete the report itself
  await MyGlobal.prisma.community_platform_reports.delete({
    where: { id: props.reportId },
  });

  // No return (void)
}
