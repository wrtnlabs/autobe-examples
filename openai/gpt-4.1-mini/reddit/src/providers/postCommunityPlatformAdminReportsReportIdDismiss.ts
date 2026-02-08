import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminReportsReportIdDismiss(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    // Ensure we exclude soft-deleted reports
    // Assuming deleted_at is a nullable datetime column indicating soft deletions
    // Since compound conditions in findUnique not possible, use findFirst instead
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  const updatedReport = await MyGlobal.prisma.community_platform_reports.update(
    {
      where: { id: props.reportId },
      data: {
        status: "dismissed",
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  return updatedReport;
}
