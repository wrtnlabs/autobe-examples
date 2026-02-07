import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunitiesSearch(props: {
  body: IRedditPlatformCommunity.IRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {} satisfies Prisma.reddit_platform_communitiesWhereInput;
  const data = await MyGlobal.prisma.reddit_platform_communities.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { subscriber_count: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      icon_url: true,
      subscriber_count: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_communities.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      name: record.name,
      description: record.description ?? undefined,
      icon_url: record.icon_url ?? undefined,
      subscriber_count: record.subscriber_count,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
