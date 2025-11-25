import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityBBSModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityBBSReport.IInvert> {
  const report = await MyGlobal.prisma.community_bbs_reports.findUnique({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
  });

  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  // Validate moderator has authority to view this report
  if (report.moderator_id && report.moderator_id !== props.moderator.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Return the reportId as string to match IInvert type which is defined as string in DTO
  return props.reportId;
}
