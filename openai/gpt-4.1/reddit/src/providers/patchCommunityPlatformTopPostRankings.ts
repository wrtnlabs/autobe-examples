import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformTopPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTopPostRanking";
import { IPageICommunityPlatformTopPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTopPostRanking";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformTopPostRankings(props: {
  body: ICommunityPlatformTopPostRanking.IRequest;
}): Promise<IPageICommunityPlatformTopPostRanking.ISummary> {
  const { interval, page, limit, sort, community_id } = props.body;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {
    interval,
    ...(community_id !== undefined && { community_id }),
  };
  // Only allow sorting by allowed fields (rank, score, computed_at)
  const ALLOWED_SORT_FIELDS = ["rank", "score", "computed_at"];
  let orderBy;
  if (sort && ALLOWED_SORT_FIELDS.includes(sort)) {
    orderBy = {
      [sort]:
        sort === "rank"
          ? ("asc" as Prisma.SortOrder)
          : ("desc" as Prisma.SortOrder),
    };
  } else {
    orderBy = { rank: "asc" as Prisma.SortOrder };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.mv_community_platform_top_post_rankings.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.mv_community_platform_top_post_rankings.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((row) => ({
      id: row.id,
      post_id: row.post_id,
      rank: row.rank,
      score: row.score,
      interval: row.interval,
      algorithm_version: row.algorithm_version,
      computed_at: toISOStringSafe(row.computed_at),
    })),
  };
}
