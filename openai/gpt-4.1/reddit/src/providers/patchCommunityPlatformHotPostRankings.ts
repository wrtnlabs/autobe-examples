import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformHotPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformHotPostRanking";
import { IPageICommunityPlatformHotPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformHotPostRanking";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformHotPostRankings(props: {
  body: ICommunityPlatformHotPostRanking.IRequest;
}): Promise<IPageICommunityPlatformHotPostRanking.ISummary> {
  // Extract query and pagination parameters with defaults
  const {
    min_rank,
    min_score,
    computed_since,
    page = 1,
    limit = 100,
    sort_by = "rank",
    sort_order = "asc",
  } = props.body || {};

  const skip = ((page ?? 1) - 1) * (limit ?? 100);
  const take = limit ?? 100;

  // Build the Prisma where condition
  const where = {
    ...(typeof min_rank === "number" && { rank: { gte: min_rank } }),
    ...(typeof min_score === "number" && { score: { gte: min_score } }),
    ...(computed_since && { computed_at: { gte: computed_since } }),
  };

  // Build the Prisma orderBy condition
  let orderByField = "rank";
  if (sort_by === "score" || sort_by === "computed_at") {
    orderByField = sort_by;
  }
  const orderBy = { [orderByField]: sort_order === "desc" ? "desc" : "asc" };

  // Parallel fetch for page data and total count
  const [entries, records] = await Promise.all([
    MyGlobal.prisma.mv_community_platform_hot_post_rankings.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    MyGlobal.prisma.mv_community_platform_hot_post_rankings.count({ where }),
  ]);

  // Map entries to response DTO, converting datetime
  const data = entries.map((entry) => ({
    id: entry.id,
    post_id: entry.post_id,
    rank: entry.rank,
    score: entry.score,
    algorithm_version: entry.algorithm_version,
    computed_at: toISOStringSafe(entry.computed_at),
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: take satisfies number as number,
      records,
      pages: Math.ceil(records / take),
    },
    data,
  };
}
