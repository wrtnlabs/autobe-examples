import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPostReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getPoliticalForumModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IPoliticalForumPostReport> {
  const postReport =
    await MyGlobal.prisma.political_forum_post_reports.findUnique({
      where: { id: props.reportId, deleted_at: null },
    });

  if (postReport) return postReport.id as IPoliticalForumPostReport;

  const commentReport =
    await MyGlobal.prisma.political_forum_comment_reports.findUnique({
      where: { id: props.reportId, deleted_at: null },
    });

  if (commentReport) return commentReport.id as IPoliticalForumPostReport;

  throw new HttpException("Report not found", 404);
}
