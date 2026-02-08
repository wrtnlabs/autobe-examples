import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
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

export async function getCommunityPlatformModeratorCommentReportsCommentReportId(props: {
  moderator: ModeratorPayload;
  commentReportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentReport> {
  const report =
    await MyGlobal.prisma.community_platform_comment_reports.findUnique({
      where: { id: props.commentReportId },
      include: {
        comment: true,
        reporterUser: true,
        reportReason: true,
      },
    });
  if (report === null) {
    throw new HttpException("Comment report not found", 404);
  }
  // Helper: converts possible null Date to ISO string with the format tag
  const toDateTimeString = (
    date: Date | null,
  ): (string & tags.Format<"date-time">) | null => {
    if (date === null) return null;
    return date.toISOString();
  };
  return {
    id: report.id,
    comment_id: report.comment_id,
    reporter_user_id: report.reporter_user_id,
    report_reason_id: report.report_reason_id ?? null,
    status: report.status,
    description: report.description ?? null,
    created_at: toDateTimeString(report.created_at),
    updated_at: toDateTimeString(report.updated_at),
    deleted_at: toDateTimeString(report.deleted_at),
    comment: report.comment,
    reporterUser: report.reporterUser,
    reportReason: report.reportReason,
  };
}
