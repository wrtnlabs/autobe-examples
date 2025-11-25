import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityBBSAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityBBSReport.IInvert> {
  const report = await MyGlobal.prisma.community_bbs_reports.findUnique({
    where: { id: props.reportId },
  });

  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  return report.id;
}
