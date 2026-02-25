import { IEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleView";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleView";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicBoardArticleViewAtSummaryTransformer } from "../transformers/EconomicBoardArticleViewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardAdministratorAnalytics(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIEconomicBoardArticleView.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Extract groupBy configuration from transformer
  const groupByConfig = EconomicBoardArticleViewAtSummaryTransformer.groupBy();
  const by = Object.keys(groupByConfig.groupBy) as any[];
  const data = await MyGlobal.prisma.economic_board_article_views.groupBy({
    by: by,
    where: {
      ...groupByConfig.where,
      created_at: {
        gte: toISOStringSafe(thirtyDaysAgo),
      },
    },
    _count: groupByConfig._count,
    _min: groupByConfig._min,
    _max: groupByConfig._max,
  });
  const total = await MyGlobal.prisma.economic_board_article_views.count({
    where: {
      ...groupByConfig.where,
      created_at: {
        gte: toISOStringSafe(thirtyDaysAgo),
      },
    },
  });
  // Map Prisma groupBy results to match transformer's expected payload structure
  const mappedData = data.map((item) => {
    // Extract groupBy keys and aggregate values
    const groupByValues = by.reduce(
      (acc, key) => {
        acc[key] = item[key];
        return acc;
      },
      {} as Record<string, any>,
    );
    // Extract aggregate values
    const aggregates = {
      count: item._count?.id || 0,
      userIdCount: item._count?.user_id || 0,
      minCreatedAt: item._min?.created_at
        ? toISOStringSafe(item._min.created_at)
        : null,
      maxCreatedAt: item._max?.created_at
        ? toISOStringSafe(item._max.created_at)
        : null,
    };
    // Combine groupBy keys and aggregates into a single object matching transformer's Payload type
    return { ...groupByValues, ...aggregates };
  });
  const transformedData = await ArrayUtil.asyncMap(
    mappedData,
    EconomicBoardArticleViewAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEconomicBoardArticleView.ISummary;
}
