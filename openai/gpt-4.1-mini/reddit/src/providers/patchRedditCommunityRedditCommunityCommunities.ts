import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditCommunityRedditCommunityCommunities(props: {
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const filter = props.body;

  const page = (filter.page && filter.page > 0
    ? filter.page
    : 1) satisfies number as number;
  const limit = (filter.limit && filter.limit > 0
    ? filter.limit
    : 100) satisfies number as number;
  const skip = (page - 1) * limit;

  const whereCondition = {
    AND: [
      { deleted_at: filter.deleted_at_is_null ? null : undefined },
      filter.name ? { name: { contains: filter.name } } : {},
      filter.title ? { title: { contains: filter.title } } : {},
      filter.created_at_from || filter.created_at_to
        ? {
            created_at: {
              ...(filter.created_at_from
                ? { gte: filter.created_at_from }
                : {}),
              ...(filter.created_at_to ? { lte: filter.created_at_to } : {}),
            },
          }
        : {},
    ],
  };

  const sortOrder: "asc" | "desc" =
    filter.sort_order === "asc" ? "asc" : "desc";

  const orderBy = filter.sort_by
    ? ({
        [filter.sort_by]: sortOrder,
      } satisfies { [key: string]: "asc" | "desc" })
    : ({ created_at: "desc" } satisfies { created_at: "desc" });

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_communities.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_communities.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((item) => ({
      id: item.id,
      name: item.name,
      title: item.title,
      description: item.description ?? undefined,
      creator_id: item.creator_id,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
