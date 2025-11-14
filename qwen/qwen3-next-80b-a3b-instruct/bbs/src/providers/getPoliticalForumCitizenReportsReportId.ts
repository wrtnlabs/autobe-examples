import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPostReport";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function getPoliticalForumCitizenReportsReportId(props: {
  citizen: CitizenPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IPoliticalForumPostReport> {
  // Query both report tables for the same reportId
  const [postReport, commentReport] = await Promise.all([
    MyGlobal.prisma.political_forum_post_reports.findUnique({
      where: { id: props.reportId, deleted_at: null },
    }),
    MyGlobal.prisma.political_forum_comment_reports.findUnique({
      where: { id: props.reportId, deleted_at: null },
    }),
  ]);

  // Determine which report was found (if any)
  const foundReport = postReport || commentReport;

  // If no report found, return 404
  if (!foundReport) {
    throw new HttpException("Report not found", 404);
  }

  // Since IPoliticalForumPostReport is defined as a string type,
  // return the reportId string itself as the response.
  return props.reportId as IPoliticalForumPostReport;
}
