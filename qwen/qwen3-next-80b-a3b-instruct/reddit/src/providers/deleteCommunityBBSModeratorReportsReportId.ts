import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityBBSModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const report = await MyGlobal.prisma.community_bbs_reports.findUnique({
    where: {
      id: props.reportId,
      deleted_at: null,
      actor_type: "moderator",
    },
  });

  if (!report) {
    throw new HttpException("Report not found or not authorized", 404);
  }

  // Verify the reporter ID matches the authenticated moderator
  if (report.moderator_id !== props.moderator.id) {
    throw new HttpException("Report not authorized for this moderator", 403);
  }

  await MyGlobal.prisma.community_bbs_reports.delete({
    where: {
      id: props.reportId,
    },
  });
}
