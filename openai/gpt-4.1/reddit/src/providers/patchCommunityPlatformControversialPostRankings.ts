import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformControversialPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformControversialPostRanking";
import { IPageICommunityPlatformControversialPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformControversialPostRanking";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

export async function patchCommunityPlatformControversialPostRankings(props: {
  body: ICommunityPlatformControversialPostRanking.IRequest;
}): Promise<IPageICommunityPlatformControversialPostRanking> {
  const {
    interval,
    algorithmVersion,
    rankMin,
    rankMax,
    controversyScoreMin,
    controversyScoreMax,
    page,
    limit,
  } = props.body;
  const currentPage = page && page > 0 ? page : 1;
  const pageLimit = limit && limit > 0 ? Math.min(limit, 100) : 100;
  const offset = (currentPage - 1) * pageLimit;
  const where: Record<string, any> = {};
  if (interval !== undefined) {
    where.interval = interval;
  }
  if (algorithmVersion !== undefined) {
    where.algorithm_version = algorithmVersion;
  }
  if (rankMin !== undefined || rankMax !== undefined) {
    where.rank = {};
    if (rankMin !== undefined) where.rank.gte = rankMin;
    if (rankMax !== undefined) where.rank.lte = rankMax;
  }
  if (controversyScoreMin !== undefined || controversyScoreMax !== undefined) {
    where.controversy_score = {};
    if (controversyScoreMin !== undefined)
      where.controversy_score.gte = controversyScoreMin;
    if (controversyScoreMax !== undefined)
      where.controversy_score.lte = controversyScoreMax;
  }
  const [records, total] = await Promise.all([
    MyGlobal.prisma.mv_community_platform_controversial_post_rankings.findMany({
      where,
      orderBy: [
        ...(interval ? [{ interval: "asc" as Prisma.SortOrder }] : []),
        { rank: "asc" as Prisma.SortOrder },
        { controversy_score: "desc" as Prisma.SortOrder },
      ],
      skip: offset,
      take: pageLimit,
      include: {
        post: {
          select: {
            id: true,
            community_id: true,
            user_id: true,
            community: {
              select: {
                id: true,
                name: true,
                display_title: true,
                description: true,
                visibility: true,
                image_url: true,
                status: true,
              },
            },
            user: { select: { id: true } },
          },
        },
      },
    }),
    MyGlobal.prisma.mv_community_platform_controversial_post_rankings.count({
      where,
    }),
  ]);
  const data: ICommunityPlatformControversialPostRanking[] = records
    .filter((x: any) => x.post)
    .map((x: any) => ({
      id: x.id,
      post: {
        id: x.post.id,
        community_id: x.post.community_id,
        community: x.post.community
          ? {
              id: x.post.community.id,
              name: x.post.community.name,
              display_title: x.post.community.display_title,
              description: x.post.community.description,
              visibility: x.post.community.visibility,
              image_url: x.post.community.image_url ?? undefined,
              status: x.post.community.status,
            }
          : undefined,
        user_id: x.post.user_id,
        user: x.post.user ? { id: x.post.user.id } : undefined,
      },
      post_id: x.post_id,
      rank: x.rank,
      controversy_score: x.controversy_score,
      interval: x.interval,
      algorithm_version: x.algorithm_version,
      computed_at: toISOStringSafe(x.computed_at),
    }));
  return {
    pagination: {
      current: currentPage satisfies number as number,
      limit: pageLimit,
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data,
  };
}
