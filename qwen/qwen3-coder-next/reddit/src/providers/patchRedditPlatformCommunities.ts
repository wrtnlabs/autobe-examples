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

export async function patchRedditPlatformCommunities(props: {
  body: IRedditPlatformCommunity.IRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  // Find communities with pagination
  const data = await MyGlobal.prisma.reddit_platform_communities.findMany({
    where: {},
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.reddit_platform_communities.count({
    where: {},
  });
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      name: record.name,
      description: record.description,
      icon_url: record.icon_url === null ? undefined : record.icon_url,
      subscriber_count: record.subscriber_count,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
