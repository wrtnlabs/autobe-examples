import { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityDashboardSummaryTransformer } from "../transformers/CommunityDashboardSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminAnalytics(props: {
  admin: AdminPayload;
}): Promise<ICommunityUsageMetric> {
  const latestMetric = await MyGlobal.prisma.community_usage_metrics.findFirst({
    orderBy: { timestamp: "desc" },
    ...CommunityDashboardSummaryTransformer.select(),
  });
  if (!latestMetric) {
    throw new HttpException("No usage metrics available", 404);
  }
  return CommunityDashboardSummaryTransformer.transform(latestMetric);
}
