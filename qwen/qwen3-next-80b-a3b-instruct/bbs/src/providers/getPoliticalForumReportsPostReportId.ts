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

export async function getPoliticalForumReportsPostReportId(props: {
  citizen: CitizenPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IPoliticalForumPostReport> {
  const report = await MyGlobal.prisma.political_forum_post_reports.findUnique({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
  });

  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  return report.id;
}
