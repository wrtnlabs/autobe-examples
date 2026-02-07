import { ICommunityDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityDashboardSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityDashboardSummaryTransformer } from "../transformers/CommunityDashboardSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberDashboard(props: {
  member: MemberPayload;
}): Promise<ICommunityDashboardSummary> {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const latestMetric = await MyGlobal.prisma.community_usage_metrics.findFirst({
    where: {
      timestamp: {
        gte: fiveMinutesAgo,
      },
    },
    orderBy: {
      timestamp: "desc",
    },
  });
  if (!latestMetric) {
    // If no record in last 5 minutes, get the most recent one
    const mostRecentMetric =
      await MyGlobal.prisma.community_usage_metrics.findFirst({
        orderBy: {
          timestamp: "desc",
        },
      });
    if (!mostRecentMetric) {
      throw new HttpException("No usage metrics available", 404);
    }
    // Even though it's not fresh, return it as per spec
    return await CommunityDashboardSummaryTransformer.transform(
      mostRecentMetric,
    );
  }
  return await CommunityDashboardSummaryTransformer.transform(latestMetric);
}
