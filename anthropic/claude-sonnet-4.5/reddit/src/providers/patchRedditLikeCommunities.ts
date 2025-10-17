import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditLikeCommunities(props: {
  body: IRedditLikeCommunity.IRequest;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const { body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  const allowedSortFields = ["subscriber_count", "created_at", "name"];
  const sortBy =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";

  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const whereConditions = {
    deleted_at: null,
    ...(body.primary_category !== undefined &&
      body.primary_category !== null && {
        primary_category: body.primary_category,
      }),
    ...(body.privacy_type !== undefined &&
      body.privacy_type !== null && {
        privacy_type: body.privacy_type,
      }),
    ...(body.is_archived !== undefined &&
      body.is_archived !== null && {
        is_archived: body.is_archived,
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.trim().length > 0 && {
        OR: [
          {
            name: {
              contains: body.search,
            },
          },
          {
            description: {
              contains: body.search,
            },
          },
        ],
      }),
  };

  const [communities, totalCount] = await Promise.all([
    MyGlobal.prisma.reddit_like_communities.findMany({
      where: whereConditions,
      orderBy:
        sortBy === "subscriber_count"
          ? { subscriber_count: sortOrder }
          : sortBy === "created_at"
            ? { created_at: sortOrder }
            : { name: sortOrder },
      skip: skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        icon_url: true,
        subscriber_count: true,
        primary_category: true,
      },
    }),
    MyGlobal.prisma.reddit_like_communities.count({
      where: whereConditions,
    }),
  ]);

  const summaries = communities.map((community) => {
    const truncatedDescription = community.description
      ? (community.description.substring(0, 100) as string &
          tags.MaxLength<100>)
      : undefined;

    return {
      id: community.id as string & tags.Format<"uuid">,
      code: community.code,
      name: community.name,
      description: truncatedDescription,
      icon_url: community.icon_url === null ? undefined : community.icon_url,
      subscriber_count: community.subscriber_count,
      primary_category: community.primary_category,
    };
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: totalPages,
    },
    data: summaries,
  };
}
