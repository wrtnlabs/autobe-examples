import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityBBSAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const report = await MyGlobal.prisma.community_bbs_reports.findUnique({
    where: { id: props.reportId },
  });

  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  await MyGlobal.prisma.community_bbs_reports.delete({
    where: { id: props.reportId },
  });
}
