import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminReportStatusesStatusId(props: {
  admin: AdminPayload;
  statusId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { statusId } = props;

  // Confirm the report status exists
  await MyGlobal.prisma.reddit_community_report_statuses.findUniqueOrThrow({
    where: { id: statusId },
  });

  // Check if any active reports reference this status
  const relatedReportsCount =
    await MyGlobal.prisma.reddit_community_reports.count({
      where: {
        status_id: statusId,
        deleted_at: null,
      },
    });

  if (relatedReportsCount > 0) {
    throw new HttpException(
      "Cannot delete report status: It is currently in use",
      409,
    );
  }

  // Delete the status permanently
  await MyGlobal.prisma.reddit_community_report_statuses.delete({
    where: { id: statusId },
  });
}
