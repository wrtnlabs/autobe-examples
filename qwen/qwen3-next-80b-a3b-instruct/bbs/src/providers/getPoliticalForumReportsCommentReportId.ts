import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumCommentReport";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function getPoliticalForumReportsCommentReportId(props: {
  citizen: CitizenPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IPoliticalForumCommentReport> {
  const report =
    await MyGlobal.prisma.political_forum_comment_reports.findUnique({
      where: { id: props.reportId },
    });

  if (!report) {
    throw new HttpException("Comment report not found", 404);
  }

  return report.id;
}
