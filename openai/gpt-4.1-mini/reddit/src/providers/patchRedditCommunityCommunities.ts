import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditCommunityCommunities(props: {
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const { page, limit, search, status, sortBy, sortDirection } = props.body;

  const skip =
    (page satisfies number as number) * (limit satisfies number as number);
  const take = limit satisfies number as number;

  const where: Prisma.reddit_community_communitiesWhereInput = {
    deleted_at: null,
    ...(search
      ? { name: { contains: search, mode: "insensitive" as Prisma.QueryMode } }
      : {}),
    ...(status && status !== "all" ? { status: status } : {}),
  };

  type SortByKey = "name" | "created_at" | "updated_at";
  const sortMap: Record<string, SortByKey> = {
    communityName: "name",
    createdAt: "created_at",
    updatedAt: "updated_at",
  };

  const orderBy: Prisma.reddit_community_communitiesOrderByWithRelationInput =
    sortBy && sortDirection && sortMap[sortBy]
      ? { [sortMap[sortBy]]: sortDirection as "asc" | "desc" }
      : { name: "asc" };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_communities.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_communities.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(
        total / (limit satisfies number as number),
      ) satisfies number as number,
    },
    data: data.map((community) => ({
      id: community.id,
      communityName: community.name,
      status: community.status,
      creator_id: community.creator_id,
    })),
  };
}
