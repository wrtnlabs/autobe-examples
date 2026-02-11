import { ICommunityReportAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityReportAnalyticTransformer } from "../transformers/CommunityReportAnalyticTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminAnalyticsReports(props: {
  admin: AdminPayload;
}): Promise<ICommunityReportAnalytic> {
  const reports = await MyGlobal.prisma.community_reports.findMany({
    where: { deleted_at: null },
    ...CommunityReportAnalyticTransformer.select(),
  });
  return await CommunityReportAnalyticTransformer.transform(reports);
}
