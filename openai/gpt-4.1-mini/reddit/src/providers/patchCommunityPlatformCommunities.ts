import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunities(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where = { deleted_at: null };
  const orderBy: {
    name: "asc";
  } = { name: "asc" };
  const data = await MyGlobal.prisma.community_platform_communities.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      description: true,
      icon_url: true,
    },
  });
  const total = await MyGlobal.prisma.community_platform_communities.count({
    where,
  });
  return {
    data: data.map((item) => ({
      ...item,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
