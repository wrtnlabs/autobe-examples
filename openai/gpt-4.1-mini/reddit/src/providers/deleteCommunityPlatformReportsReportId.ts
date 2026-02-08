import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformReportsReportId(props: {
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  const deleted = await MyGlobal.prisma.community_platform_reports.delete({
    where: { id: props.reportId },
  });
  return deleted;
}
