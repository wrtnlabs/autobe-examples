import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";
import { IPageIRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunitySystemConfigurations(props: {
  admin: AdminPayload;
  body: IRedditCommunitySystemConfiguration.IRequest;
}): Promise<IPageIRedditCommunitySystemConfiguration.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  const search = body.search;
  const validSortKeys = [
    "config_key",
    "config_value",
    "created_at",
    "updated_at",
  ] as const;
  const validSortOrders = ["asc", "desc"] as const;

  const sortKeyCandidate = body.sortKey;
  const sortOrderCandidate = body.sortOrder;

  const sortKey =
    sortKeyCandidate !== undefined && validSortKeys.includes(sortKeyCandidate)
      ? (sortKeyCandidate satisfies (typeof validSortKeys)[number] as (typeof validSortKeys)[number])
      : "created_at";
  const sortOrder =
    sortOrderCandidate !== undefined &&
    validSortOrders.includes(sortOrderCandidate)
      ? (sortOrderCandidate satisfies (typeof validSortOrders)[number] as (typeof validSortOrders)[number])
      : "desc";

  const whereCondition = {
    ...(search !== undefined &&
      search !== null &&
      search.length > 0 && {
        OR: [
          { config_key: { contains: search } },
          { config_value: { contains: search } },
        ],
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_system_configurations.findMany({
      where: whereCondition,
      orderBy: { [sortKey]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_system_configurations.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((config) => ({
      id: config.id,
      config_key: config.config_key,
      config_value: config.config_value,
      description: config.description ?? null,
      created_at: toISOStringSafe(config.created_at),
      updated_at: toISOStringSafe(config.updated_at),
    })),
  };
}
