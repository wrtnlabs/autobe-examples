import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditLikeContentReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeContentReport> {
  const { reportId } = props;

  const report =
    await MyGlobal.prisma.reddit_like_content_reports.findUniqueOrThrow({
      where: { id: reportId },
    });

  return {
    id: report.id as string & tags.Format<"uuid">,
    content_type: report.content_type,
    violation_categories: report.violation_categories,
    additional_context: report.additional_context ?? undefined,
    status: report.status,
    is_anonymous_report: report.is_anonymous_report,
    is_high_priority: report.is_high_priority,
    created_at: toISOStringSafe(report.created_at),
  };
}
