import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, reportId } = props;

  // Verify the report exists, throws 404 if not found
  await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
    where: { id: reportId },
  });

  // Perform hard delete
  await MyGlobal.prisma.reddit_community_reports.delete({
    where: { id: reportId },
  });
}
